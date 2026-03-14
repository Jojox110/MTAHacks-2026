import json
import sqlite3

def get_all_courses(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM courses").fetchall()
    courses = []
    for r in rows:
        courses.append({
            "id": r["id"],
            "name": r["name"],
            "dept": r["department"],
            "credits": r["credits"],
            "prereqs": json.loads(r["prereqs"]),
            "schedule": json.loads(r["schedule"]),
            "color": r["color"],
        })
    return courses

def get_departments(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("SELECT DISTINCT department FROM courses ORDER BY department").fetchall()
    return [r["department"] for r in rows]

def get_career_paths(conn: sqlite3.Connection) -> dict:
    rows = conn.execute("SELECT * FROM career_paths").fetchall()
    paths = {}
    for r in rows:
        paths[r["name"]] = {
            "description": r["description"],
            "required": json.loads(r["required"]),
            "recommended": json.loads(r["recommended"]),
        }
    return paths
