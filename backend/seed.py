import json
import sqlite3
from config import DB_PATH

def seed():
    conn = sqlite3.connect(DB_PATH)

    # Seed courses
    with open("data/courses.json") as f:
        courses = json.load(f)

    for c in courses:
        conn.execute(
            "INSERT OR IGNORE INTO courses (id, name, department, credits, prereqs, schedule, color) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (c["id"], c["name"], c["dept"], c["credits"], json.dumps(c["prereqs"]), json.dumps(c["schedule"]), c.get("color")),
        )

    # Seed career paths
    with open("data/career_paths.json") as f:
        paths = json.load(f)

    for name, data in paths.items():
        conn.execute(
            "INSERT OR IGNORE INTO career_paths (name, description, required, recommended) VALUES (?, ?, ?, ?)",
            (name, data["description"], json.dumps(data["required"]), json.dumps(data["recommended"])),
        )

    conn.commit()
    conn.close()

if __name__ == "__main__":
    seed()
