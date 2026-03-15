"""
Multi-turn AI academic advisor — delegates generation to the shared Qwen worker.
"""

from __future__ import annotations

import json
import sqlite3
from typing import Optional


# ── Course selection helpers ─────────────────────────────────────────────────

def _get_relevant_courses(
    conn: sqlite3.Connection,
    profile: str,
    current_courses: list[str],
    limit: int = 18,
) -> list[dict]:
    """Keyword-score all courses against the student profile, return top matches."""
    rows = conn.execute(
        "SELECT id, name, department, description, credits FROM courses"
    ).fetchall()

    lower = profile.lower()
    keywords = [w for w in lower.split() if len(w) > 3]

    scored = []
    for r in rows:
        if r["id"] in current_courses:
            continue
        score = 0
        name_l = r["name"].lower()
        desc_l = (r["description"] or "").lower()
        for kw in keywords:
            if kw in name_l:
                score += 3
            if kw in desc_l:
                score += 1
        if score > 0:
            scored.append((score, dict(r)))

    scored.sort(key=lambda x: -x[0])

    if not scored:
        fallback = [dict(r) for r in rows if r["id"] not in current_courses]
        return fallback[:limit]

    return [r for _, r in scored[:limit]]


def _build_system_prompt(
    student_profile: str,
    available_courses: list[dict],
    num_to_select: int,
) -> str:
    classes_lines = "\n".join(
        f"- {c['id']}: {c['name']}. {(c.get('description') or '').strip() or 'No description available.'}"
        for c in available_courses
    )

    return f"""You are an expert, interactive academic advisor. Your task is to help the student select EXACTLY {num_to_select} classes from the provided list that best align with their profile.

Here is the student's profile:
<student_profile>
{student_profile}
</student_profile>

Here is the list of available classes and their descriptions:
<available_classes>
{classes_lines}
</available_classes>

### INSTRUCTIONS FOR INTERACTION ###
You must not finalize the selection immediately. You must engage the student based on the following conditions:

1. OBVIOUS MATCHES: If exactly {num_to_select} classes perfectly align with the profile, list your recommendations, explain your reasoning, and ask: "Do these sound good to you, or would you like to make adjustments?"
2. UNCLEAR/TOO MANY MATCHES: If there are more than {num_to_select} good options, do not guess. Present the top contenders and ask 1 or 2 specific questions to narrow down their exact preferences.
3. NO GOOD MATCHES: If none of the classes fit well, explicitly acknowledge that and present the "next best" options, then ask targeted questions to help the student choose.

### OUTPUT FORMATTING ###
- Phase 1 (Conversation): While discussing or confirming with the student, reply using normal conversational text. Do NOT output any JSON.
- Phase 2 (Finalization): ONLY after the student explicitly confirms their final {num_to_select} choices, output STRICTLY the following JSON. No conversational text before or after:

{{
  "recommendations": [
    {{
      "class_name": "Name of the class",
      "class_id": "Course code e.g. INFO2001",
      "reasoning": "A concise explanation of the agreed-upon reasoning."
    }}
  ]
}}"""


def _try_parse_finalization(text: str, available_courses: list[dict]) -> Optional[list[dict]]:
    """Return recommendations list if the response is a final JSON block, else None."""
    stripped = text.strip()
    if not (stripped.startswith("{") and stripped.endswith("}")):
        return None
    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        return None
    if "recommendations" not in parsed:
        return None

    recs = parsed["recommendations"]
    for rec in recs:
        if not rec.get("class_id"):
            name = rec.get("class_name", "").lower()
            for c in available_courses:
                if c["name"].lower() == name or c["id"].lower() in name:
                    rec["class_id"] = c["id"]
                    break
    return recs


# ── Public API ───────────────────────────────────────────────────────────────

def chat_with_advisor(
    conn: sqlite3.Connection,
    student_profile: str,
    history: list[dict],
    current_message: str,
    current_courses: list[str],
    num_to_select: int = 2,
) -> dict:
    """
    Multi-turn conversation with Qwen acting as an academic advisor.

    Args:
        conn: DB connection for fetching available courses.
        student_profile: Full profile text from the student's first message.
        history: Previous [{"role": "user"|"assistant", "content": str}] turns.
        current_message: The student's latest message.
        current_courses: Course IDs already in the schedule (excluded from candidates).
        num_to_select: How many courses to recommend.

    Returns:
        {
            "message": str,          # Qwen's reply
            "finalized": bool,       # True when student confirmed & JSON emitted
            "recommendations": list, # Populated when finalized
            "history": list,         # Full updated history
        }
    """
    from qwen_worker import enqueue

    available_courses = _get_relevant_courses(conn, student_profile, current_courses)
    system_prompt = _build_system_prompt(student_profile, available_courses, num_to_select)

    messages = list(history) + [{"role": "user", "content": current_message}]

    result = enqueue({"kind": "chat", "system": system_prompt, "messages": messages, "max_new_tokens": 1024})
    assistant_text = result["text"]

    recs = _try_parse_finalization(assistant_text, available_courses)
    finalized = recs is not None

    updated_history = messages + [{"role": "assistant", "content": assistant_text}]

    return {
        "message": assistant_text,
        "finalized": finalized,
        "recommendations": recs or [],
        "history": updated_history,
    }
