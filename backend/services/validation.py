"""Reusable medicine validation: normalization, deduplication, suggestions.

Single source of truth for how medicine names are compared across the
project (manual creation, updates, OCR import, assistant lookups).
"""

from __future__ import annotations

import difflib
import re
from typing import Optional

from sqlalchemy.orm import Session

from models import Medicine

# Brand -> canonical/generic name. Keys are lowercase, stripped of suffixes
# like "xr", "sr", "er" so "Metformin XR" resolves to "Metformin".
BRAND_ALIASES: dict[str, str] = {
    "paracetamol": "Paracetamol",
    "acetaminophen": "Paracetamol",
    "tylenol": "Paracetamol",
    "crocin": "Paracetamol",
    "dolo": "Paracetamol",
    "calpol": "Paracetamol",
    "ibuprofen": "Ibuprofen",
    "advil": "Ibuprofen",
    "brufen": "Ibuprofen",
    "metformin": "Metformin",
    "glucophage": "Metformin",
    "glycomet": "Metformin",
    "glucovance": "Metformin",
    "amlodipine": "Amlodipine",
    "amlip": "Amlodipine",
    "amlong": "Amlodipine",
    "amlocard": "Amlodipine",
    "atorvastatin": "Atorvastatin",
    "lipitor": "Atorvastatin",
    "atorva": "Atorvastatin",
    "lisinopril": "Lisinopril",
    "zestril": "Lisinopril",
    "losartan": "Losartan",
    "cozaar": "Losartan",
    "losar": "Losartan",
    "omeprazole": "Omeprazole",
    "prilosec": "Omeprazole",
    "pantoprazole": "Pantoprazole",
    "somac": "Pantoprazole",
    "amoxicillin": "Amoxicillin",
    "augmentin": "Amoxicillin",
    "azithromycin": "Azithromycin",
    "zithromax": "Azithromycin",
    "levothyroxine": "Levothyroxine",
    "thyronorm": "Levothyroxine",
    "synthroid": "Levothyroxine",
    "eltroxin": "Levothyroxine",
    "thyroxine": "Levothyroxine",
    "glimepiride": "Glimepiride",
    "amaril": "Glimepiride",
    "sitagliptin": "Sitagliptin",
    "januvia": "Sitagliptin",
    "clopidogrel": "Clopidogrel",
    "plavix": "Clopidogrel",
    "warfarin": "Warfarin",
    "coumadin": "Warfarin",
    "aspirin": "Aspirin",
    "ecospirin": "Aspirin",
    "disprin": "Aspirin",
    "cetirizine": "Cetirizine",
    "zyrtec": "Cetirizine",
    "montelukast": "Montelukast",
    "singulair": "Montelukast",
    "salbutamol": "Salbutamol",
    "ventolin": "Salbutamol",
    "gabapentin": "Gabapentin",
    "neurontin": "Gabapentin",
    "sertraline": "Sertraline",
    "zoloft": "Sertraline",
    "vitamin d": "Vitamin D",
    "vitamin d3": "Vitamin D",
    "cholecalciferol": "Vitamin D",
    "vitamin b12": "Vitamin B12",
    "cyanocobalamin": "Vitamin B12",
    "folic acid": "Folic Acid",
    "calcium": "Calcium",
    "iron": "Iron",
    "ferrous sulfate": "Iron",
    "insulin": "Insulin",
}

# Multi-word aliases must be checked before single-word ones.
_ALIAS_KEYS = sorted(BRAND_ALIASES, key=len, reverse=True)

_SUFFIX_RE = re.compile(r"\b(xr|sr|er|cr|od|ds|forte|extended|sustained|release)\b")


def normalize_name(name: str) -> str:
    """Canonical display name: brand -> generic, cleaned and title-cased."""
    raw = re.sub(r"\s+", " ", (name or "").strip()).lower()
    if not raw:
        return ""
    cleaned = _SUFFIX_RE.sub(" ", raw)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    canonical = BRAND_ALIASES.get(cleaned)
    if canonical:
        return canonical
    return " ".join(word.capitalize() for word in cleaned.split())


def canonical_key(name: str) -> str:
    """Stable comparison key for a medicine name."""
    return normalize_name(name).lower()


def find_existing(
    db: Session,
    user_id: int,
    name: str,
    dosage: Optional[str] = None,
    dosage_unit: Optional[str] = None,
    exclude_id: Optional[int] = None,
) -> Optional[Medicine]:
    """Return an existing medicine of the user that this name maps to.

    Prefers an exact canonical-name match; when a dosage is supplied the
    same-name + same-dosage match wins over a bare name match.
    """
    key = canonical_key(name)
    if not key:
        return None

    query = db.query(Medicine).filter(
        Medicine.user_id == user_id,
        Medicine.is_active.is_(True),
    )
    if exclude_id is not None:
        query = query.filter(Medicine.id != exclude_id)

    candidates = query.all()
    exact = []
    for med in candidates:
        if canonical_key(med.name) == key:
            exact.append(med)

    if not exact:
        return None
    if len(exact) == 1:
        return exact[0]

    dose_norm = _normalize_dosage(dosage)
    unit_norm = (dosage_unit or "").strip().lower()
    for med in exact:
        if _normalize_dosage(med.dosage) == dose_norm and (
            (med.dosage_unit or "").strip().lower() == unit_norm or not unit_norm
        ):
            return med
    return exact[0]


def find_similar(
    db: Session,
    user_id: int,
    name: str,
    exclude_id: Optional[int] = None,
    limit: int = 3,
) -> list[dict]:
    """Near-duplicate candidates for a name (typographic/brand variations)."""
    query = db.query(Medicine).filter(Medicine.user_id == user_id)
    if exclude_id is not None:
        query = query.filter(Medicine.id != exclude_id)
    medicines = query.all()

    target = normalize_name(name).lower()
    if not target:
        return []

    scored = []
    for med in medicines:
        med_key = canonical_key(med.name)
        if med_key == target:
            continue
        ratio = difflib.SequenceMatcher(None, target, med_key).ratio()
        contains = target in med_key or med_key in target
        score = ratio + (0.2 if contains else 0.0)
        if score >= 0.72:
            scored.append((score, med))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [
        {
            "id": med.id,
            "name": med.name,
            "dosage": med.dosage,
            "dosage_unit": med.dosage_unit,
            "similarity": round(score, 2),
        }
        for score, med in scored[:limit]
    ]


def suggest_correction(name: str) -> Optional[str]:
    """Return a corrected/canonical name if a known alias exists."""
    canonical = normalize_name(name)
    if canonical and canonical.lower() != (name or "").strip().lower():
        return canonical
    return None


def _normalize_dosage(value: Optional[str]) -> str:
    if value is None:
        return ""
    text = re.sub(r"\s+", " ", str(value).strip()).lower()
    match = re.match(r"^([\d.]+)\s*([a-z%]*)$", text)
    return f"{match.group(1)} {match.group(2)}".strip() if match else text
