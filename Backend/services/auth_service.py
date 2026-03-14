import uuid
import sqlite3

def register_user(conn: sqlite3.Connection, name: str, email: str, major: str | None, minor: str | None) -> dict:
    token = str(uuid.uuid4())
    try:
        conn.execute(
            "INSERT INTO users (name, email, major, minor, token) VALUES (?, ?, ?, ?, ?)",
            (name, email, major, minor, token),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        # Email already exists — treat as login
        return login_user(conn, email)

    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return dict(row)

def login_user(conn: sqlite3.Connection, email: str) -> dict | None:
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row:
        return None
    # Refresh token on login
    token = str(uuid.uuid4())
    conn.execute("UPDATE users SET token = ? WHERE id = ?", (token, row["id"]))
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (row["id"],)).fetchone()
    return dict(row)

def get_user_by_token(conn: sqlite3.Connection, token: str) -> dict | None:
    row = conn.execute("SELECT * FROM users WHERE token = ?", (token,)).fetchone()
    return dict(row) if row else None
