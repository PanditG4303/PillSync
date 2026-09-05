"""Central AI service — routes every AI task to the right model.

Single entry point for the app:
  - Prescription OCR       -> Gemma    (task "ocr")
  - Chat / all other tasks -> Nemotron (task "assistant")

Every method degrades gracefully: when the API key is missing or the
provider errors, callers receive None (or a local fallback) instead of an
exception, so the app keeps working without AI credentials.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

from services.ai_config import AIRouter, AIRouterError, TASK_ASSISTANT, is_configured

logger = logging.getLogger("pillsync-ai-service")

MEDICAL_DISCLAIMER = (
    "AI-generated information is informational only and is not a substitute for "
    "professional medical advice. Always consult your doctor or pharmacist before "
    "starting, stopping, or changing any medication."
)

LIFESTYLE_DISCLAIMER = (
    "Lifestyle suggestions are general wellness guidance only, not medical advice. "
    "Speak with a healthcare professional about what is right for you."
)


def _extract_json(content: str) -> dict[str, Any]:
    """Safely pull the first JSON object out of a model response."""
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model response")
    return json.loads(text[start : end + 1])


class AIService:
    """High-level AI facade with per-task prompts and safe fallbacks."""

    def __init__(self, router: Optional[AIRouter] = None):
        self.router = router or AIRouter()

    # ------------------------------------------------------------------
    # Assistants / chat
    # ------------------------------------------------------------------

    def assistant_chat(
        self,
        system_prompt: str,
        user_message: str,
        history: Optional[list[dict]] = None,
        task: str = TASK_ASSISTANT,
    ) -> Optional[str]:
        """Chat with the assistant model. Returns None when AI is unavailable."""
        messages = [{"role": "system", "content": system_prompt}]
        for item in history or []:
            role = item.get("role") if item.get("role") in ("user", "assistant") else "user"
            content = str(item.get("content") or "")
            if content.strip():
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_message})
        try:
            return self.router.generate(task, messages, max_tokens=700, temperature=0.3)
        except AIRouterError as exc:
            logger.info("AI chat unavailable (%s) — using fallback", exc.__class__.__name__)
            return None

    def lifestyle_advice(self, prompt: str) -> Optional[str]:
        try:
            return self.router.generate(
                TASK_ASSISTANT,
                [{"role": "user", "content": prompt}],
                max_tokens=900,
                temperature=0.5,
            )
        except AIRouterError as exc:
            logger.info("AI lifestyle unavailable (%s) — using fallback", exc.__class__.__name__)
            return None

    # ------------------------------------------------------------------
    # Drug interaction checker
    # ------------------------------------------------------------------

    INTERACTION_PROMPT = (
        "You are a clinical pharmacology reviewer for a medication tracking app. "
        "Analyze ONLY the medicines listed below. For each pair that could interact, "
        "return an object with: \"medicines\" (the two names), \"severity\" (one of "
        "Low, Medium, High), \"description\" (what the interaction is), and "
        "\"precaution\" (what the user should do). Add general observations to "
        "\"notes\". Respond with VALID JSON ONLY using exactly this shape:\n"
        "{\n"
        '  "interactions": [\n'
        '    {"medicines": ["A", "B"], "severity": "Medium", "description": "...", "precaution": "..."}\n'
        "  ],\n"
        '  "notes": ["..."]\n'
        "}\n"
        "If no interactions are known, return empty arrays. Never invent drug names.\n"
        "Medicines:\n"
    )

    def check_interactions(self, medicine_names: list[str]) -> Optional[dict]:
        prompt = self.INTERACTION_PROMPT + "\n".join(f"- {name}" for name in medicine_names)
        try:
            content = self.router.generate(
                TASK_ASSISTANT,
                [{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.2,
            )
            return _extract_json(content)
        except AIRouterError as exc:
            logger.info("AI interaction check unavailable (%s)", exc.__class__.__name__)
            return None
        except (ValueError, json.JSONDecodeError) as exc:
            logger.warning("AI interaction response was malformed: %s", exc)
            return None

    # ------------------------------------------------------------------
    # AI health summary / report generation
    # ------------------------------------------------------------------

    SUMMARY_PROMPT = (
        "You are a health analytics assistant. Based ONLY on the user's report data below "
        "(medication adherence, refill status, health metrics, and nutrition), write a SHORT "
        "health summary — one paragraph of at most 120 words. Cover in this order: overall "
        "adherence, anything concerning from health metrics or missed doses, refill needs, "
        "and nutrition. Use plain text, no headings, no bullet lists, no markdown. "
        "Be factual, encouraging, and non-diagnostic. Never diagnose or prescribe. Data:\n"
    )

    def generate_health_summary(self, data_json: str) -> Optional[str]:
        try:
            return self.router.generate(
                TASK_ASSISTANT,
                [{"role": "user", "content": self.SUMMARY_PROMPT + data_json}],
                max_tokens=800,
                temperature=0.4,
            )
        except AIRouterError as exc:
            logger.info("AI summary unavailable (%s) — using fallback", exc.__class__.__name__)
            return None


# Module-level singleton so all routers share one client.
ai_service = AIService()

__all__ = [
    "AIService",
    "MEDICAL_DISCLAIMER",
    "LIFESTYLE_DISCLAIMER",
    "ai_service",
    "is_configured",
    "TASK_ASSISTANT",
]
