"""ORBIT Agent - Data layer for tasks, notes, and memories (SQLite)."""

from __future__ import annotations

import sqlite3
import json
import os
from datetime import datetime, timezone
from typing import Optional

DB_PATH = os.getenv("ORBIT_DATA_DB", "/tmp/orbit-data.db")


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    _init_tables(conn)
    return conn


def _init_tables(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            due_date TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            created_at TEXT DEFAULT (datetime('now')),
            accessed_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()


# ─── Tasks ───────────────────────────────────────────────────────

def create_task(title: str, description: str = "", priority: str = "medium",
                due_date: Optional[str] = None) -> dict:
    conn = _get_db()
    cur = conn.execute(
        "INSERT INTO tasks (title, description, priority, due_date) VALUES (?, ?, ?, ?)",
        (title, description, priority, due_date),
    )
    conn.commit()
    task_id = cur.lastrowid
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    return dict(row)


def complete_task(task_id: int) -> dict:
    conn = _get_db()
    conn.execute(
        "UPDATE tasks SET status = 'completed', completed_at = datetime('now') WHERE id = ?",
        (task_id,),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    if not row:
        return {"error": f"Task {task_id} not found"}
    return dict(row)


def list_tasks(status: str | None = None, limit: int = 20) -> list[dict]:
    conn = _get_db()
    if status and status != "all":
        rows = conn.execute(
            "SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?",
            (status, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_task(task_id: int) -> dict:
    conn = _get_db()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not row:
        conn.close()
        return {"error": f"Task {task_id} not found"}
    conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return {"deleted": True, "task": dict(row)}


# ─── Notes ───────────────────────────────────────────────────────

def create_note(title: str, content: str, tags: Optional[list[str]] = None) -> dict:
    conn = _get_db()
    tags_json = json.dumps(tags or [])
    cur = conn.execute(
        "INSERT INTO notes (title, content, tags) VALUES (?, ?, ?)",
        (title, content, tags_json),
    )
    conn.commit()
    note_id = cur.lastrowid
    row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    conn.close()
    return dict(row)


def list_notes(tag: Optional[str] = None, limit: int = 20) -> list[dict]:
    conn = _get_db()
    if tag:
        rows = conn.execute(
            "SELECT * FROM notes WHERE tags LIKE ? ORDER BY created_at DESC LIMIT ?",
            (f"%{tag}%", limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM notes ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_note(note_id: int) -> dict:
    conn = _get_db()
    row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    if not row:
        conn.close()
        return {"error": f"Note {note_id} not found"}
    conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    return {"deleted": True, "note": dict(row)}


# ─── Memories ────────────────────────────────────────────────────

def remember(key: str, content: str, category: str = "general") -> dict:
    conn = _get_db()
    conn.execute(
        "INSERT INTO memories (key, content, category) VALUES (?, ?, ?) "
        "ON CONFLICT(key) DO UPDATE SET content = ?, category = ?, accessed_at = datetime('now')",
        (key, content, category, content, category),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM memories WHERE key = ?", (key,)).fetchone()
    conn.close()
    return dict(row)


def recall(key: str | None = None, category: str | None = None) -> dict | list[dict]:
    conn = _get_db()
    if key:
        row = conn.execute("SELECT * FROM memories WHERE key = ?", (key,)).fetchone()
        if not row:
            conn.close()
            return {"error": f"No memory found for '{key}'"}
        conn.execute(
            "UPDATE memories SET accessed_at = datetime('now') WHERE key = ?", (key,)
        )
        conn.commit()
        conn.close()
        return dict(row)
    else:
        return recall_all(category=category)


def recall_all(category: Optional[str] = None, limit: int = 50) -> list[dict]:
    conn = _get_db()
    if category:
        rows = conn.execute(
            "SELECT * FROM memories WHERE category = ? ORDER BY accessed_at DESC LIMIT ?",
            (category, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM memories ORDER BY accessed_at DESC LIMIT ?", (limit,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def forget(key: str) -> dict:
    conn = _get_db()
    row = conn.execute("SELECT * FROM memories WHERE key = ?", (key,)).fetchone()
    if not row:
        conn.close()
        return {"error": f"No memory found for '{key}'"}
    conn.execute("DELETE FROM memories WHERE key = ?", (key,))
    conn.commit()
    conn.close()
    return {"forgotten": True, "key": key}
