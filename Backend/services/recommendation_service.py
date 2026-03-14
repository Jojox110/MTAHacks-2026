"""
AI/ML recommendation engine.
Teammates: replace the body of `recommend()` with your algorithm.
The function receives the user's prompt, current courses, major, and minor,
and should return a dict with careerPath, description, required, recommended.
"""

import sqlite3
from services.course_service import get_career_paths

KEYWORDS = {
    "Software Engineer": ["software", "web", "app", "code", "programming", "developer", "full stack", "frontend", "backend"],
    "Data Scientist": ["data", "analytics", "statistics", "analysis", "insight"],
    "Cybersecurity Analyst": ["security", "cyber", "hacking", "network", "protect"],
    "AI/ML Engineer": ["ai", "machine learning", "ml", "artificial intelligence", "deep learning", "neural"],
    "Product Manager": ["product", "manage", "lead", "strategy", "pm"],
    "Financial Analyst": ["finance", "financial", "investment", "banking", "accounting", "money"],
    "Biomedical Engineer": ["biomedical", "medical", "health", "bio", "healthcare"],
    "UX Researcher": ["ux", "user experience", "design", "research", "usability"],
}

def recommend(
    conn: sqlite3.Connection,
    prompt: str,
    current_courses: list[str],
    major: str | None = None,
    minor: str | None = None,
) -> dict:
    paths = get_career_paths(conn)
    lower = prompt.lower()

    best_match = "Software Engineer"
    best_score = 0

    for path_name, words in KEYWORDS.items():
        score = sum(1 for w in words if w in lower)
        if score > best_score:
            best_score = score
            best_match = path_name

    path_data = paths[best_match]
    return {
        "careerPath": best_match,
        "description": path_data["description"],
        "required": path_data["required"],
        "recommended": path_data["recommended"],
    }
