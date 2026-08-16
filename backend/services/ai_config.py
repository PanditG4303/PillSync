"""AI model configuration for PillSync.

Exactly two models, both served through OpenRouter:

  - Gemma    (google/gemma-4-26b-a4b-it:free) -> prescription OCR,
               prescription parsing and medicine image understanding.
  - Nemotron (nvidia/nemotron-3.5-lightning:free) -> every other AI feature:
               chatbot, medicine explanations, lifestyle advice, health
               reports, symptom guidance, diet and exercise suggestions.

Environment overrides (all optional):
  OPENROUTER_API_KEY     shared API key for both models (UI-managed value wins)
  AI_MODEL_OCR           OCR model id (defaults to Gemma)
  AI_MODEL_ASSISTANT     assistant model id (defaults to Nemotron)

Admins can manage the key from the Settings page; a stored key overrides the
environment variable. The in-memory cache keeps the service stateless between
requests.
"""

import logging
import os
import json
from typing import Optional

import httpx

logger = logging.getLogger("pillsync-ai-config")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
REQUEST_TIMEOUT_SECONDS = 60

TASK_OCR = "ocr"
TASK_ASSISTANT = "assistant"
VALID_TASKS = (TASK_OCR, TASK_ASSISTANT)

DEFAULT_MODEL_OCR = "google/gemma-4-26b-a4b-it:free"
DEFAULT_MODEL_ASSISTANT = "nvidia/nemotron-3.5-lightning:free"

# Backup models tried when the primary model is rate limited or failing.
# Override with AI_MODEL_OCR_FALLBACKS / AI_MODEL_ASSISTANT_FALLBACKS.
DEFAULT_FALLBACK_MODELS = {
    TASK_OCR: ["google/gemma-3-27b-it", "openai/gpt-4o-mini"],
    TASK_ASSISTANT: ["openai/gpt-4o-mini", "anthropic/claude-3-5-haiku-20241022"],
}

STORE_KEY_NAME = "openrouter_api_key"

_stored_key = ""
_stored_key_loaded = False


def _load_stored_key() -> None:
    """Lazy-load the DB-managed key once per process."""
    global _stored_key, _stored_key_loaded
    if _stored_key_loaded:
        return
    _stored_key_loaded = True
    try:
        from database import SessionLocal
        from models import AISetting

        db = SessionLocal()
        try:
            row = db.query(AISetting).filter(AISetting.key_name == STORE_KEY_NAME).first()
            _stored_key = (row.key_value if row else "").strip()
        finally:
            db.close()
    except Exception as exc:  # DB store must never break AI routing
        logger.warning("Failed to load stored AI key: %s", exc)


def resolve_api_key() -> str:
    """The OpenRouter key: UI-managed value first, then the environment."""
    _load_stored_key()
    return _stored_key or os.getenv("OPENROUTER_API_KEY", "").strip()


def is_configured() -> bool:
    return bool(resolve_api_key())


def key_source() -> str:
    """Where the active key comes from: 'db', 'env' or 'none'."""
    _load_stored_key()
    if _stored_key:
        return "db"
    if os.getenv("OPENROUTER_API_KEY", "").strip():
        return "env"
    return "none"


def masked_api_key() -> str:
    key = resolve_api_key()
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}...{key[-4:]}"


def set_stored_api_key(value: str):
    """Persist a UI-managed key and refresh the in-memory cache."""
    global _stored_key, _stored_key_loaded
    from datetime import datetime

    from database import SessionLocal
    from models import AISetting

    clean = (value or "").strip()
    db = SessionLocal()
    try:
        row = db.query(AISetting).filter(AISetting.key_name == STORE_KEY_NAME).first()
        if clean:
            if not row:
                row = AISetting(key_name=STORE_KEY_NAME, key_value=clean)
                db.add(row)
            else:
                row.key_value = clean
            row.updated_at = datetime.utcnow()
        elif row:
            db.delete(row)
        db.commit()
    finally:
        db.close()
    _stored_key = clean
    _stored_key_loaded = True


def clear_stored_api_key():
    set_stored_api_key("")


def test_connection(timeout: int = 20) -> tuple[bool, str]:
    """Validate the active key against the OpenRouter models endpoint."""
    api_key = resolve_api_key()
    if not api_key:
        return False, "No AI API key is configured."
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(
                OPENROUTER_MODELS_URL,
                headers={"Authorization": f"Bearer {api_key}"},
            )
    except httpx.HTTPError as exc:
        logger.warning("AI key test failed: %s", exc.__class__.__name__)
        return False, "AI service is unreachable."
    if response.status_code == 200:
        return True, "Connected to OpenRouter. The key works."
    if response.status_code == 401:
        return False, "OpenRouter rejected the key (HTTP 401)."
    return False, f"OpenRouter returned HTTP {response.status_code}."


def model_for(task: str) -> str:
    """Gemma for OCR; Nemotron for every other task."""
    if task == TASK_OCR:
        return os.getenv("AI_MODEL_OCR", "").strip() or DEFAULT_MODEL_OCR
    return os.getenv("AI_MODEL_ASSISTANT", "").strip() or DEFAULT_MODEL_ASSISTANT


def model_chain_for(task: str) -> list[str]:
    """Primary model first, then fallbacks — deduplicated, in order."""
    primary = model_for(task)
    if task == TASK_OCR:
        env_name = "AI_MODEL_OCR_FALLBACKS"
    else:
        env_name = "AI_MODEL_ASSISTANT_FALLBACKS"
    configured = os.getenv(env_name, "").strip()
    if configured:
        candidates = [primary] + [m.strip() for m in configured.split(",") if m.strip()]
    else:
        candidates = [primary] + [m for m in DEFAULT_FALLBACK_MODELS.get(task, []) if m != primary]
    chain: list[str] = []
    for model in candidates:
        if model and model not in chain:
            chain.append(model)
    return chain


class AIRouterError(RuntimeError):
    """Raised when the AI service cannot produce a response."""


class AIRouter:
    """Stateless, thread-safe OpenRouter client used by the AI service."""

    def __init__(self, timeout: int = REQUEST_TIMEOUT_SECONDS):
        self.timeout = timeout

    def generate(
        self,
        task: str,
        messages: list[dict],
        max_tokens: int = 700,
        temperature: float = 0.3,
    ) -> str:
        api_key = resolve_api_key()
        if not api_key:
            raise AIRouterError("AI is not configured (missing OPENROUTER_API_KEY)")
        if task not in VALID_TASKS:
            task = TASK_ASSISTANT

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        errors: list[str] = []
        for model in model_chain_for(task):
            payload = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(OPENROUTER_URL, headers=headers, json=payload)
            except httpx.HTTPError as exc:
                logger.warning("AI request failed (%s): %s", model, exc.__class__.__name__)
                errors.append(f"{model}: unreachable")
                continue

            if response.status_code in (401, 403):
                raise AIRouterError("AI authentication failed (check your OpenRouter API key)")
            if response.status_code == 429:
                logger.warning("AI model %s rate limited (HTTP 429)", model)
                errors.append(f"{model}: rate limited")
                continue
            if response.status_code != 200:
                logger.warning("AI model %s returned HTTP %s", model, response.status_code)
                errors.append(f"{model}: HTTP {response.status_code}")
                continue

            try:
                content = response.json()["choices"][0]["message"]["content"]
            except (ValueError, KeyError, IndexError, TypeError) as exc:
                logger.warning("AI model %s returned an unreadable response", model)
                errors.append(f"{model}: unreadable response")
                continue
            return str(content).strip()

        raise AIRouterError("; ".join(errors) or "AI service returned an unreadable response")

    def generate_stream(
        self,
        task: str,
        messages: list[dict],
        max_tokens: int = 700,
        temperature: float = 0.3,
    ):
        """Stream token deltas from OpenRouter (SSE). Yields str chunks.

        Raises AIRouterError on setup/HTTP failures; yields chunks as they arrive.
        """
        api_key = resolve_api_key()
        if not api_key:
            raise AIRouterError("AI is not configured (missing OPENROUTER_API_KEY)")
        if task not in VALID_TASKS:
            task = TASK_ASSISTANT

        payload = {
            "model": model_for(task),
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=None) as client:
                with client.stream("POST", OPENROUTER_URL, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        raise AIRouterError(f"AI service returned HTTP {response.status_code}")
                    for line in response.iter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            break
                        try:
                            delta = json.loads(data)["choices"][0]["delta"]["content"]
                        except (ValueError, KeyError, IndexError, TypeError):
                            continue
                        if delta:
                            yield str(delta)
        except httpx.HTTPError as exc:
            logger.warning("AI stream failed: %s", exc.__class__.__name__)
            raise AIRouterError("AI service is unreachable") from exc