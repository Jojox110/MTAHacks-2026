import json
import sqlite3
from config import DB_PATH

def seed():
    conn = sqlite3.connect(DB_PATH)

    # Check if already seeded
    count = conn.execute("SELECT COUNT(*) FROM courses").fetchone()[0]
    if count > 0:
        conn.close()
        return

    with open("data/courses.json", encoding="utf-8") as f:
        courses = json.load(f)

    for c in courses:
        conn.execute(
            "INSERT OR IGNORE INTO courses (id, name, department, credits, prereqs, description, ofg, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                c["id"],
                c["name"],
                c["dept"],
                c.get("credits", 3),
                json.dumps(c.get("prereqs", [])),
                c.get("description", ""),
                c.get("ofg"),
                c.get("color"),
            ),
        )

    conn.commit()
    conn.close()
    print(f"Seeded {len(courses)} courses")

if __name__ == "__main__":
    from database import init_db
    init_db()
    seed()
