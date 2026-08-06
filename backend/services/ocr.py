"""AI prescription extraction via OpenRouter multimodal vision."""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
from typing import Any

import httpx
from fastapi import HTTPException

from core.constants import DISEASE_CATEGORIES, FREQUENCY_TO_TIMES

logger = logging.getLogger("pillsync-ocr")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free"
REQUEST_TIMEOUT_SECONDS = 60

MIME_BY_FORMAT = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}

FREQUENCY_ALIASES = {
    "once_daily": "once_daily",
    "once daily": "once_daily",
    "once a day": "once_daily",
    "od": "once_daily",
    "daily": "once_daily",
    "every morning": "once_daily",
    "twice_daily": "twice_daily",
    "twice daily": "twice_daily",
    "twice a day": "twice_daily",
    "bd": "twice_daily",
    "bid": "twice_daily",
    "b.d.": "twice_daily",
    "b.i.d.": "twice_daily",
    "thrice_daily": "thrice_daily",
    "thrice daily": "thrice_daily",
    "three times daily": "thrice_daily",
    "three times a day": "thrice_daily",
    "tds": "thrice_daily",
    "tid": "thrice_daily",
    "t.d.s.": "thrice_daily",
    "t.i.d.": "thrice_daily",
    "four_times_daily": "four_times_daily",
    "four times daily": "four_times_daily",
    "qid": "four_times_daily",
    "q.i.d.": "four_times_daily",
    "bedtime": "bedtime",
    "at bedtime": "bedtime",
    "hs": "bedtime",
    "every night": "bedtime",
    "as_needed": "as_needed",
    "as needed": "as_needed",
    "as required": "as_needed",
    "prn": "as_needed",
    "sos": "as_needed",
}

FREQUENCY_SLOT_COUNT = {
    "once_daily": 1,
    "twice_daily": 2,
    "thrice_daily": 3,
    "four_times_daily": 4,
    "bedtime": 1,
    "as_needed": 1,
}

FREQUENCY_DEFAULT_SLOT = "08:00"

TIME_RE = re.compile(r"^([01]?\d|2[0-3]):[0-5]\d$")

EXTRACTION_PROMPT = (
    "You are a prescription transcription and structured extraction assistant.\n\n"
    "Analyze the supplied prescription image, including reasonably readable printed "
    "or handwritten text.\n\n"
    "Extract ONLY information that is visibly present or reasonably readable from the "
    "prescription.\n"
    "Never invent: medicine names, dosage, strength, quantity, frequency, instructions, "
    "or reminder times.\n"
    "If a field cannot be read reliably, return null.\n\n"
    "Understand common prescription abbreviations where reasonably clear:\n"
    "OD = once daily\n"
    "BD/BID = twice daily\n"
    "TDS/TID = three times daily\n"
    "QID = four times daily\n"
    "HS = at bedtime\n"
    "SOS/PRN = as needed\n\n"
    "Preserve the original instruction text where useful.\n"
    "Never convert frequency into exact clock times unless the prescription actually "
    "contains those times.\n\n"
    "Respond with valid JSON only, using exactly this structure:\n"
    "{\n"
    '  "raw_text": "the recognized prescription text",\n'
    '  "medicines": [\n'
    "    {\n"
    '      "name": "medicine name or null",\n'
    '      "dosage": 500,\n'
    '      "dosage_unit": "mg",\n'
    '      "medicine_type": "tablet",\n'
    '      "quantity": 60,\n'
    '      "quantity_per_dose": 1,\n'
    '      "frequency": "twice_daily",\n'
    '      "frequency_original": "BD",\n'
    '      "instructions": "after meals",\n'
    '      "times": ["08:00", "20:00"],\n'
    '      "confidence": 0.9\n'
    "    }\n"
    "  ],\n"
    '  "warnings": []\n'
    "}\n\n"
    "Rules:\n"
    '- "times" must contain ONLY exact times explicitly written on the prescription '
    "(for example \"8 AM and 8 PM\"). Otherwise return an empty array.\n"
    '- "frequency" must be one of: once_daily, twice_daily, thrice_daily, '
    "four_times_daily, bedtime, as_needed. Use null if unclear.\n"
    '- "dosage_unit" must be one of: mg, mcg, g, ml, IU, or null.\n'
    '- "medicine_type" must be one of: tablet, capsule, liquid, injection, cream, '
    "inhaler, drops, other, or null.\n"
    '- "quantity" is the total number of units dispensed when visible (for example '
    "60 or 30), otherwise null.\n"
    'Return an empty "medicines" array if no medicine can be confidently identified.'
)


def _clean_number(value: Any) -> str:
    """Convert a numeric-ish value to a display string (no trailing .0)."""
    if value is None:
        return ""
    try:
        num = float(value)
        if num.is_integer():
            return str(int(num))
        return str(num)
    except (TypeError, ValueError):
        return str(value).strip()


def _normalize_time(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    candidate = value.strip().lower()
    match = re.match(r"^(\d{1,2})\s*(?:(?::|\.)\s*(\d{2}))?\s*(am|pm)?$", candidate)
    if not match:
        return None
    hour, minute, meridian = match.group(1), match.group(2), match.group(3)
    hour_int = int(hour)
    minute_int = int(minute) if minute else 0
    if minute_int > 59:
        return None
    if meridian == "pm" and hour_int < 12:
        hour_int += 12
    elif meridian == "am" and hour_int == 12:
        hour_int = 0
    if hour_int > 23:
        return None
    return f"{hour_int:02d}:{minute_int:02d}"


def _normalize_frequency(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    key = value.strip().lower().replace("_", " ").strip()
    return FREQUENCY_ALIASES.get(key)


def _normalize_medicine_type(value: Any) -> str:
    if not isinstance(value, str):
        return "Tablet"
    return value.strip().capitalize() or "Tablet"


def _normalize_dosage_unit(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    unit = value.strip().lower()
    if unit in ("mg", "mcg", "g", "ml", "iu", "tablet", "capsule"):
        return "IU" if unit == "iu" else unit
    return ""


def _default_times_for_frequency(frequency: str | None) -> list[str]:
    count = FREQUENCY_SLOT_COUNT.get(frequency, 1)
    return [FREQUENCY_DEFAULT_SLOT] * count


def _normalize_medicine(item: Any, index: int) -> dict[str, Any]:
    if not isinstance(item, dict):
        raise ValueError(f"Medicine entry {index} is not an object")

    name = str(item.get("name") or "").strip()
    if not name:
        raise ValueError(f"Medicine entry {index} has no name")

    dosage_raw = item.get("dosage")
    dosage_unit = _normalize_dosage_unit(item.get("dosage_unit"))
    dosage = _clean_number(dosage_raw)
    if isinstance(dosage_raw, str):
        match = re.match(r"^\s*([\d.]+)\s*([a-z]+)?\s*$", dosage_raw, re.IGNORECASE)
        if match:
            dosage = _clean_number(match.group(1))
            if not dosage_unit and match.group(2):
                dosage_unit = _normalize_dosage_unit(match.group(2))

    frequency = _normalize_frequency(item.get("frequency"))
    frequency_original = item.get("frequency_original")
    if frequency_original is not None:
        frequency_original = str(frequency_original).strip() or None

    times: list[str] = []
    raw_times = item.get("times") or []
    for t in raw_times:
        normalized = _normalize_time(t)
        if normalized and normalized not in times:
            times.append(normalized)

    # Do NOT invent reminder times: use defaults only as editable UI slots.
    if not times:
        times = _default_times_for_frequency(frequency)

    try:
        quantity = float(item.get("quantity") or 30)
    except (TypeError, ValueError):
        quantity = 30.0
    if quantity <= 0:
        quantity = 30.0

    try:
        quantity_per_dose = float(item.get("quantity_per_dose") or 1)
    except (TypeError, ValueError):
        quantity_per_dose = 1.0
    if quantity_per_dose <= 0:
        quantity_per_dose = 1.0

    try:
        confidence = float(item.get("confidence") or 0.8)
    except (TypeError, ValueError):
        confidence = 0.8
    confidence = max(0.0, min(1.0, confidence))

    category = str(item.get("disease_category") or "").strip()
    if category not in DISEASE_CATEGORIES:
        category = "General"

    return {
        "name": name,
        "dosage": dosage,
        "dosage_unit": dosage_unit,
        "medicine_type": _normalize_medicine_type(item.get("medicine_type")),
        "disease_category": category,
        "frequency": frequency or "once_daily",
        "frequency_original": frequency_original,
        "quantity": quantity,
        "quantity_per_dose": quantity_per_dose,
        "instructions": str(item.get("instructions") or "").strip(),
        "times": times,
        "schedules": [{"reminder_time": t, "days_of_week": None} for t in times],
        "confidence": confidence,
    }


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


class OpenRouterExtractor:
    """Prescription extraction through the OpenRouter multimodal API."""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    async def extract(self, data_url: str) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACTION_PROMPT},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            "max_tokens": 1500,
            "temperature": 0.1,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
        except httpx.TimeoutException as exc:
            logger.warning("OpenRouter request timed out")
            raise HTTPException(
                status_code=504,
                detail="Prescription AI took too long to respond. Please try again.",
            ) from exc
        except httpx.HTTPError as exc:
            logger.warning("OpenRouter request failed: %s", exc.__class__.__name__)
            raise HTTPException(
                status_code=502,
                detail="Could not reach the prescription AI service. Please try again.",
            ) from exc

        if response.status_code == 401 or response.status_code == 403:
            raise HTTPException(
                status_code=502,
                detail="Prescription AI authentication failed. Check OPENROUTER_API_KEY in backend/.env.",
            )
        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Prescription scanner is temporarily rate limited. Please try again.",
            )
        if response.status_code >= 500:
            raise HTTPException(
                status_code=502,
                detail="Prescription AI service is temporarily unavailable. Please try again.",
            )
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Prescription AI returned an unexpected error. Please try again.",
            )

        try:
            body = response.json()
            content = body["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            logger.warning("OpenRouter response malformed")
            raise HTTPException(
                status_code=502,
                detail="Prescription AI returned an unreadable response. Please try again.",
            ) from exc

        try:
            return _extract_json(content)
        except (ValueError, json.JSONDecodeError) as exc:
            logger.warning("OpenRouter returned malformed JSON")
            raise HTTPException(
                status_code=502,
                detail="Prescription AI returned an unreadable response. Please try again.",
            ) from exc


def _get_api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Prescription AI is not configured. Add OPENROUTER_API_KEY to backend/.env.",
        )
    return key


def _encode_image(image_bytes: bytes) -> str:
    """Validate the image and return its base64 data URL."""
    try:
        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes))
        image_format = (image.format or "").upper()
        if image_format not in MIME_BY_FORMAT:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a JPG, PNG, or WEBP photo.",
            )
        image.verify()
        mime = MIME_BY_FORMAT[image_format]
    except HTTPException:
        raise
    except Exception as exc:
        logger.info("Invalid prescription image: %s", exc.__class__.__name__)
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted image. Please upload a clear JPG, PNG, or WEBP photo.",
        ) from exc

    return f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"


class OCRService:
    """Facade: validate image, extract via OpenRouter, normalize results."""

    async def scan(self, image_bytes: bytes, filename: str = "") -> dict[str, Any]:
        api_key = _get_api_key()
        model = os.getenv("OPENROUTER_MODEL", "").strip() or DEFAULT_MODEL
        data_url = _encode_image(image_bytes)

        parsed = await OpenRouterExtractor(api_key, model).extract(data_url)

        raw_text = str(parsed.get("raw_text") or "").strip()
        warnings = parsed.get("warnings")
        ai_warnings: list[str] = []
        if isinstance(warnings, list):
            ai_warnings = [str(w) for w in warnings if str(w).strip()]
        elif isinstance(warnings, str) and warnings.strip():
            ai_warnings = [warnings.strip()]

        medicines: list[dict[str, Any]] = []
        raw_medicines = parsed.get("medicines") or []
        if isinstance(raw_medicines, list):
            for index, item in enumerate(raw_medicines):
                try:
                    medicines.append(_normalize_medicine(item, index))
                except ValueError as exc:
                    logger.info("Skipping unreadable medicine entry: %s", exc)

        if medicines:
            message = f"Detected {len(medicines)} medicine(s)"
        else:
            message = (
                "No medicines could be confidently identified. "
                "Try a clearer image or enter the medicine manually."
            )

        return {
            "engine": "openrouter",
            "raw_text": raw_text,
            "medicines": medicines,
            "count": len(medicines),
            "categories": list(DISEASE_CATEGORIES),
            "warning": "; ".join(ai_warnings) if ai_warnings else None,
            "message": message,
        }


class PrescriptionParser:
    """Rule-based NLP parser for pasted prescription text (/ocr/parse-text)."""

    DOSE_RE = re.compile(
        r"(?P<name>[A-Za-z][A-Za-z0-9\-\s]{1,40}?)\s+"
        r"(?P<dose>\d+(?:\.\d+)?)\s*(?P<unit>mg|mcg|g|ml|IU|tablet|tablets|capsule|capsules)?",
        re.IGNORECASE,
    )
    QTY_RE = re.compile(
        r"(?:qty|quantity|tabs|tablets|capsules|pack)\s*[:\-]?\s*(\d+)",
        re.IGNORECASE,
    )
    FREQ_RE = re.compile(
        r"(" + "|".join(re.escape(k) for k in sorted(FREQUENCY_TO_TIMES, key=len, reverse=True)) + r")",
        re.IGNORECASE,
    )

    def parse(self, text: str) -> list[dict[str, Any]]:
        if not text or not text.strip():
            return []

        medicines: list[dict[str, Any]] = []
        seen = set()

        for known in KNOWN_MEDICINES:
            pattern = re.compile(
                rf"\b{re.escape(known)}\b(?:\s+(?P<dose>\d+(?:\.\d+)?)\s*(?P<unit>mg|mcg|g|ml|IU)?)?",
                re.IGNORECASE,
            )
            for match in pattern.finditer(text):
                key = known.lower()
                if key in seen:
                    continue
                seen.add(key)
                dose = match.group("dose") or ""
                unit = (match.group("unit") or "mg") if dose else ""
                snippet = text[match.start() : match.end() + 100]
                medicines.append(self._build_entry(known, dose, unit, snippet, text))

        skip_words = (
            "patient", "doctor", "date", "age", "rx", "sig", "qty", "quantity",
            "twice", "thrice", "once", "daily", "morning", "night", "tablet",
            "tablets", "capsule", "capsules", "take", "with", "food", "after",
            "before", "bedtime",
        )
        for match in self.DOSE_RE.finditer(text):
            name = re.sub(r"\s+", " ", match.group("name")).strip(" -:\n\t")
            if len(name) < 3 or name.lower() in seen:
                continue
            lower_name = name.lower()
            if any(skip in lower_name for skip in skip_words):
                continue
            if not re.search(r"[A-Za-z]{3,}", name):
                continue
            clean = name.title()
            key = clean.lower()
            if key in seen:
                continue
            seen.add(key)
            snippet = text[match.start() : match.end() + 60]
            medicines.append(
                self._build_entry(
                    clean,
                    match.group("dose") or "",
                    match.group("unit") or "mg",
                    snippet,
                    text,
                )
            )

        return medicines[:8]

    def _build_entry(self, name: str, dose: str, unit: str, snippet: str, full_text: str) -> dict:
        freq_match = self.FREQ_RE.search(snippet)
        frequency = freq_match.group(1).lower() if freq_match else "once daily"
        times = FREQUENCY_TO_TIMES.get(frequency, ["08:00"])
        qty_match = self.QTY_RE.search(snippet)
        quantity = int(qty_match.group(1)) if qty_match else max(len(times) * 15, 30)
        category = self._infer_category(name, snippet)

        return {
            "name": name,
            "dosage": str(dose) if dose else "",
            "dosage_unit": unit.lower() if unit else "",
            "medicine_type": "Tablet",
            "disease_category": category,
            "frequency": frequency,
            "quantity": quantity,
            "quantity_per_dose": 1,
            "instructions": f"Take {frequency}",
            "times": list(times),
            "schedules": [{"reminder_time": t, "days_of_week": None} for t in times],
            "confidence": 0.92 if name in KNOWN_MEDICINES else 0.75,
        }

    @staticmethod
    def _infer_category(name: str, text: str) -> str:
        name_l = name.lower()
        name_map = [
            (("amlodipine", "lisinopril", "losartan"), "Blood Pressure"),
            (("metformin", "insulin", "glimepiride", "sitagliptin"), "Diabetes"),
            (("thyroxine", "thyronorm", "levothyroxine"), "Thyroid"),
            (("amoxicillin", "azithromycin"), "Antibiotics"),
            (("vitamin", "calcium", "iron", "folic"), "Vitamins"),
            (("atorvastatin", "clopidogrel", "warfarin", "aspirin"), "Heart Medications"),
        ]
        for keywords, category in name_map:
            if any(k in name_l for k in keywords):
                return category

        blob = text.lower()
        text_map = [
            (("blood pressure", "hypertension", " bp "), "Blood Pressure"),
            (("diabetes", "sugar"), "Diabetes"),
            (("thyroid"), "Thyroid"),
            (("antibiotic"), "Antibiotics"),
            (("vitamin"), "Vitamins"),
            (("heart", "cardiac"), "Heart Medications"),
        ]
        for keywords, category in text_map:
            if any(k in blob for k in keywords):
                return category
        return "General"


KNOWN_MEDICINES = [
    "Aspirin", "Paracetamol", "Acetaminophen", "Ibuprofen", "Metformin",
    "Amlodipine", "Atorvastatin", "Lisinopril", "Losartan", "Omeprazole",
    "Pantoprazole", "Amoxicillin", "Azithromycin", "Levothyroxine",
    "Thyronorm", "Insulin", "Glimepiride", "Sitagliptin", "Clopidogrel",
    "Warfarin", "Vitamin D", "Vitamin B12", "Calcium", "Iron",
    "Cetirizine", "Montelukast", "Salbutamol", "Gabapentin", "Sertraline",
]
