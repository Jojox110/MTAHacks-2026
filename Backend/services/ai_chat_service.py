"""
Multi-turn AI academic advisor — delegates generation to the shared Qwen worker.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Optional


# ── Course selection helpers ─────────────────────────────────────────────────

def _get_mandatory_codes(major: str | None) -> set[str]:
    """Load programs.json and return all obligatoire course codes for the given major."""
    if not major:
        return set()
    try:
        programs_path = Path(__file__).resolve().parent.parent.parent / "programs.json"
        with open(programs_path, encoding="utf-8") as f:
            data = json.load(f)
        for program in data.get("programs", []):
            if program.get("name") == major:
                return {
                    c["code"]
                    for year in program.get("years", [])
                    for c in year.get("courses", [])
                    if c.get("type") == "obligatoire" and c.get("code")
                }
    except Exception:
        pass
    return set()


def _get_relevant_courses(
    conn: sqlite3.Connection,
    profile: str,
    current_courses: list[str],
    excluded_codes: set[str] | None = None,
    limit: int = 18,
) -> list[dict]:
    """Keyword-score all courses against the student profile, return top matches."""
    rows = conn.execute(
        "SELECT id, name, department, description, credits FROM courses"
    ).fetchall()

    excluded = set(current_courses) | (excluded_codes or set())
    lower = profile.lower()
    keywords = [w for w in lower.split() if len(w) > 3]

    scored = []
    for r in rows:
        if r["id"] in excluded:
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
        fallback = [dict(r) for r in rows if r["id"] not in excluded]
        return fallback[:limit]

    return [r for _, r in scored[:limit]]


def _build_system_prompt(
    student_profile: str,
    available_courses: list[dict],
    num_to_select: int,
    future_courses: list[dict] | None = None,
) -> str:
    classes_lines = "\n".join(
        f"- {c['id']}: {c['name']}. {(c.get('description') or '').strip() or 'No description available.'}"
        for c in available_courses
    )

    future_section = ""
    if future_courses:
        future_lines = "\n".join(
            f"- {c['id']}: {c['name']}. {(c.get('description') or '').strip() or 'No description available.'}"
            for c in future_courses
        )
        future_section = f"""
Here is a list of courses the student cannot take yet (prerequisites not met or not offered this semester), but that they can look forward to in the future:
<future_classes>
{future_lines}
</future_classes>
"""

    return f"""You are an expert, interactive academic advisor. Your task is to help the student select EXACTLY {num_to_select} classes from the provided list that best align with their profile.

### STRICT DATA CONSTRAINT ###
The list provided in <available_classes> is the ONLY list of classes the student can register for right now. You must recommend exclusively from that list. The <future_classes> list is provided for reference only — do NOT recommend those for registration this semester.

Here is the student's profile:
<student_profile>
{student_profile}
</student_profile>

Here is the list of available classes and their descriptions:
<available_classes>
{classes_lines}
</available_classes>
{future_section}
### INSTRUCTIONS FOR INTERACTION ###
You must engage the student based on the following conditions:

1. OBVIOUS MATCHES: If exactly {num_to_select} classes from <available_classes> align with the profile, list them, explain the reasoning, and ask: "Do these sound good to you, or would you like to make adjustments?"
2. UNCLEAR/TOO MANY MATCHES: If there are more than {num_to_select} good options in <available_classes>, present the top contenders and ask 1 or 2 questions to narrow down the preference.
3. NO GOOD MATCHES: If none of the classes in <available_classes> fit the student's interests well, explicitly tell them so. Then, if <future_classes> contains relevant options, highlight 2–3 of those as courses they can look forward to taking in a future semester once prerequisites are met — and explain why those are a better fit. Finally, still ask the student to pick {num_to_select} from <available_classes> as a placeholder for this semester, presenting the closest available options.

### OUTPUT FORMATTING ###
- Phase 1 (Conversation): Use normal conversational text. Do NOT output any JSON.
- Phase 2 (Finalization): ONLY after the student explicitly confirms the choices from <available_classes>, output the decision STRICTLY in the following JSON format. No conversational text allowed in this phase.

{{
  "recommendations": [
    {{
      "class_name": "Name of the class",
      "class_id": "Course code e.g. INFO2001",
      "reasoning": "A concise explanation of the final agreed-upon reasoning."
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
    major: str | None = None,
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

    mandatory_codes = _get_mandatory_codes(major)
    available_courses = _get_relevant_courses(conn, student_profile, current_courses, excluded_codes=mandatory_codes)

    # Build future courses: scored courses from the full catalog that didn't make the
    # available list (e.g. prerequisites not yet met), so the LLM can suggest them
    # when there are no good current-semester matches.
    available_ids = {c["id"] for c in available_courses}
    excluded_for_future = set(current_courses) | mandatory_codes | available_ids
    future_courses = _get_relevant_courses(
        conn, student_profile, list(excluded_for_future), excluded_codes=set(), limit=10
    )

    system_prompt = _build_system_prompt(student_profile, available_courses, num_to_select, future_courses=future_courses)

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
