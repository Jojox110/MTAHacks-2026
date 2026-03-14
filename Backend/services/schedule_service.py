import sqlite3

def save_schedule(conn: sqlite3.Connection, user_id: int, course_ids: list[str]):
    conn.execute("DELETE FROM user_schedules WHERE user_id = ?", (user_id,))
    for cid in course_ids:
        conn.execute(
            "INSERT OR IGNORE INTO user_schedules (user_id, course_id) VALUES (?, ?)",
            (user_id, cid),
        )
    conn.commit()

def load_schedule(conn: sqlite3.Connection, user_id: int) -> list[str]:
    rows = conn.execute(
        "SELECT course_id FROM user_schedules WHERE user_id = ?", (user_id,)
    ).fetchall()
    return [r["course_id"] for r in rows]
