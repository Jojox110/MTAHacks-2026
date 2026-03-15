"""
Elective filler — delegates to the shared Qwen worker (qwen_worker.py).
"""

from __future__ import annotations


def get_elective_recommendations(
    available_classes: list[str],
    user_interests: str,
    slots_to_fill: int,
    semester_key: str = "",
) -> tuple[list[str], bool]:
    """
    Ask Qwen to pick electives from the available list.

    Returns (course_codes, needs_clarification).
    needs_clarification=True → LLM flagged no relevant matches; show choices to user.
    """
    from qwen_worker import enqueue

    formatted = "\n".join(f"- {c}" for c in available_classes)
    system = (
        f"You are an expert academic advisor. Select EXACTLY {slots_to_fill} courses "
        f"from the available list that best align with the user's career interests. "
        f"Do NOT recommend more than {slots_to_fill} courses. "
        "You MUST respond with ONLY a JSON object in this exact format, no other text:\n"
        '{"recommended_classes": ["CODE1", "CODE2"], "reasoning": "brief reason", "needs_clarification": false}\n'
        "Set needs_clarification to true only if none of the courses are relevant to the user's interests."
    )
    messages = [
        {
            "role": "user",
            "content": f"User interests:\n{user_interests}\n\nAvailable courses:\n{formatted}",
        }
    ]

    result = enqueue({"kind": "fill", "system": system, "messages": messages, "max_new_tokens": 512})

    codes = result.get("recommended_classes", [])

    out = []
    for c in codes[:slots_to_fill]:
        out.append(c.split()[0] if isinstance(c, str) and " " in c else str(c))

    # Always ask the user to confirm — never silently pick on their behalf.
    return out, True
