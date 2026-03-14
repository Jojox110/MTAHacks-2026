import sqlite3

def save_schedule(conn: sqlite3.Connection, user_id: int, schedule: dict[str, list[str]]):
    conn.execute("DELETE FROM user_schedules WHERE user_id = ?", (user_id,))
    for semester, course_ids in schedule.items():
        for cid in course_ids:
            conn.execute(
                "INSERT OR IGNORE INTO user_schedules (user_id, course_id, semester) VALUES (?, ?, ?)",
                (user_id, cid, semester),
            )
    conn.commit()

def load_schedule(conn: sqlite3.Connection, user_id: int) -> dict[str, list[str]]:
    rows = conn.execute(
        "SELECT course_id, semester FROM user_schedules WHERE user_id = ?", (user_id,)
    ).fetchall()
    schedule = {}
    for r in rows:
        sem = r["semester"]
        if sem not in schedule:
            schedule[sem] = []
        schedule[sem].append(r["course_id"])
    return schedule
