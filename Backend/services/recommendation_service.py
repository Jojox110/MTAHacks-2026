"""
AI/ML recommendation engine.
Teammates: replace the body of `recommend()` with your algorithm.
Searches course names and descriptions to find relevant courses.
"""

import json
import sqlite3

def recommend(
    conn: sqlite3.Connection,
    prompt: str,
    current_courses: list[str],
    major: str | None = None,
    minor: str | None = None,
) -> dict:
    rows = conn.execute("SELECT id, name, department, description, prereqs FROM courses").fetchall()

    lower = prompt.lower()
    keywords = [w for w in lower.split() if len(w) > 2]

    scored = []
    for r in rows:
        if r["id"] in current_courses:
            continue
        score = 0
        name_lower = r["name"].lower()
        desc_lower = (r["description"] or "").lower()
        dept = r["department"]

        for kw in keywords:
            if kw in name_lower:
                score += 3
            if kw in desc_lower:
                score += 1

        # Boost courses in the user's major/minor department
        if major and dept == major:
            score += 2
        if minor and dept == minor:
            score += 1

        if score > 0:
            scored.append((score, r))

    scored.sort(key=lambda x: -x[0])

    # Top 6 as "recommended", top 3 of those as "required" (core matches)
    top = scored[:10]
    required = [r["id"] for _, r in top[:4]]
    recommended = [r["id"] for _, r in top[4:10]]

    summary = f"Courses matching: {prompt[:80]}"
    if major:
        summary += f" (major: {major})"

    return {
        "careerPath": summary,
        "description": f"Found {len(scored)} relevant courses based on your interests.",
        "required": required,
        "recommended": recommended,
    }
