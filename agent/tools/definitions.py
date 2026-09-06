"""ORBIT Agent - Tool definitions (JSON schemas for LLM function calling)."""

BROWSER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "browser_navigate",
            "description": "Navigate the browser to a URL",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "The URL to navigate to"}
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_click",
            "description": "Click an element on the page by CSS selector or at x,y coordinates",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string", "description": "CSS selector (use for DOM elements)"},
                    "x": {"type": "integer", "description": "X coordinate (use for pixel-precise clicks)"},
                    "y": {"type": "integer", "description": "Y coordinate (use for pixel-precise clicks)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_type",
            "description": "Type text into an input field by CSS selector",
            "parameters": {
                "type": "object",
                "properties": {
                    "selector": {"type": "string", "description": "CSS selector"},
                    "text": {"type": "string", "description": "Text to type"},
                },
                "required": ["selector", "text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_press",
            "description": "Press a keyboard key (Enter, Tab, Escape, ArrowDown, etc.)",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Key to press"}
                },
                "required": ["key"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_screenshot",
            "description": "Take a screenshot of the current page for visual understanding",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_get_content",
            "description": "Get the text content of the current page",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_evaluate",
            "description": "Execute JavaScript in the page and return the result",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "JavaScript expression to evaluate"}
                },
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_go_back",
            "description": "Navigate back in browser history",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_mouse_scroll",
            "description": "Scroll the page at x,y coordinates",
            "parameters": {
                "type": "object",
                "properties": {
                    "x": {"type": "integer", "description": "X coordinate"},
                    "y": {"type": "integer", "description": "Y coordinate"},
                    "delta_y": {"type": "integer", "description": "Vertical scroll delta (positive = down)"},
                },
                "required": ["x", "y", "delta_y"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "browser_close",
            "description": "Close the browser",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

TERMINAL_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Execute a shell command and return its output",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "The shell command to execute"}
                },
                "required": ["command"],
            },
        },
    },
]

FILESYSTEM_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file (relative to sandbox)"}
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write content to a file",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file (relative to sandbox)"},
                    "content": {"type": "string", "description": "Content to write"},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_dir",
            "description": "List contents of a directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Directory path (relative to sandbox)"}
                },
            },
        },
    },
]

TASK_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a new task or to-do item. Use for assignments, deadlines, reminders, and action items.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Task title"},
                    "description": {"type": "string", "description": "Detailed description"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "description": "Priority level"},
                    "due_date": {"type": "string", "description": "Due date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM)"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "complete_task",
            "description": "Mark a task as completed",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "ID of the task to complete"}
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_tasks",
            "description": "List tasks, optionally filtered by status",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["pending", "completed", "all"], "description": "Filter by status"},
                    "limit": {"type": "integer", "description": "Max results (default 20)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Delete a task",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer", "description": "ID of the task to delete"}
                },
                "required": ["task_id"],
            },
        },
    },
]

NOTE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_note",
            "description": "Create a note for storing information, ideas, or references",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Note title"},
                    "content": {"type": "string", "description": "Note content"},
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "Tags for categorization"},
                },
                "required": ["title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_notes",
            "description": "List notes, optionally filtered by tag",
            "parameters": {
                "type": "object",
                "properties": {
                    "tag": {"type": "string", "description": "Filter by tag"},
                    "limit": {"type": "integer", "description": "Max results (default 20)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_note",
            "description": "Delete a note",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {"type": "integer", "description": "ID of the note to delete"}
                },
                "required": ["note_id"],
            },
        },
    },
]

MEMORY_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "remember",
            "description": "Store a piece of information in memory for later recall. Use for user preferences, important facts, context, or anything the user wants you to remember.",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Unique key to remember this by (e.g. 'user_name', 'project_deadline')"},
                    "content": {"type": "string", "description": "The information to remember"},
                    "category": {"type": "string", "description": "Category (e.g. 'preference', 'fact', 'context', 'deadline')"},
                },
                "required": ["key", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recall",
            "description": "Recall a specific memory by key, or list all memories in a category",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Key to look up (if omitted, lists all memories)"},
                    "category": {"type": "string", "description": "Filter by category"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "forget",
            "description": "Delete a memory by key",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Key of the memory to forget"}
                },
                "required": ["key"],
            },
        },
    },
]

SEARCH_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for information using DuckDuckGo. Returns search results with titles, URLs, and snippets.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "num_results": {"type": "integer", "description": "Number of results (default 5)"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_website",
            "description": "Open a website and return its text content. Simpler than browser_navigate for quick page reads.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL to open and read"},
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "summarize_file",
            "description": "Read a file and produce a summary of its contents",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file (relative to sandbox)"},
                },
                "required": ["path"],
            },
        },
    },
]

ALL_TOOLS = BROWSER_TOOLS + TERMINAL_TOOLS + FILESYSTEM_TOOLS + TASK_TOOLS + NOTE_TOOLS + MEMORY_TOOLS + SEARCH_TOOLS

# Minimal tool set for Groq free tier (7000 ITPM limit with Qwen tokenizer)
CORE_TOOLS = [TASK_TOOLS[2], MEMORY_TOOLS[1], SEARCH_TOOLS[0]]  # list_tasks, recall, search_web
