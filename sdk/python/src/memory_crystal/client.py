"""Crystal client. Two functions: weave and pull.

Handles MCP protocol internally. You never see it.
"""

from __future__ import annotations

import re
from typing import Any

from ._transport import StreamableHTTPTransport, DEMO_URL, TransportError


class Crystal:
    """Memory Crystal client.

    Connects to any Memory Crystal MCP server.
    Default: the free demo (15-minute memory).

    Usage:
        crystal = Crystal()
        crystal.weave("I was here.")
        memories = crystal.pull("here")

    Or as context manager:
        with Crystal() as c:
            c.weave("hello")
    """

    def __init__(self, url: str = DEMO_URL, token: str | None = None):
        self._transport = StreamableHTTPTransport(url=url, token=token)
        self._initialized = False

    def _ensure_init(self):
        if not self._initialized:
            self._transport.initialize()
            self._initialized = True

    def weave(
        self,
        text: str,
        category: str | None = None,
        tag: str | None = None,
    ) -> dict[str, Any]:
        """Write a memory.

        Args:
            text: The memory to store.
            category: One of fact, preference, event, opinion, skill.
            tag: A label for retrieval.

        Returns:
            Dict with id, message, and demo info.
        """
        self._ensure_init()

        args: dict[str, Any] = {"text": text}
        if category:
            args["category"] = category
        if tag:
            args["tag"] = tag

        result = self._transport.request("tools/call", {
            "name": "weave",
            "arguments": args,
        })

        return _parse_tool_result(result)

    def pull(
        self,
        query: str | None = None,
        n: int = 10,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        """Retrieve memories.

        Args:
            query: Search term. If None, returns all memories.
            n: Max results (default 10).

        Returns:
            List of memory dicts, or a message dict if no results.
        """
        self._ensure_init()

        args: dict[str, Any] = {"n": n}
        if query:
            args["query"] = query

        result = self._transport.request("tools/call", {
            "name": "pull",
            "arguments": args,
        })

        return _parse_tool_result(result)

    def close(self):
        """Close the connection."""
        self._transport.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def _parse_tool_result(result: dict[str, Any]) -> dict[str, Any] | list[dict[str, Any]]:
    """Extract the useful content from an MCP tool response.

    Tool responses come as: {"content": [{"type": "text", "text": "..."}]}
    We parse the text into structured data when possible.
    """
    if not result or "content" not in result:
        return {"raw": result}

    content = result["content"]
    if not content or not isinstance(content, list):
        return {"raw": result}

    text = content[0].get("text", "")

    # Try to detect if this is a "memories found" response with numbered entries
    if re.search(r"^\[\d+\]", text, re.MULTILINE):
        return _parse_memories(text)

    # Otherwise return the text as a message
    return {"message": text}


def _parse_memories(text: str) -> list[dict[str, Any]]:
    """Parse numbered memory entries from pull response.

    Format:
        [1] memory text here
            tag: something
            category: fact
            created: 2026-03-03T...
    """
    memories = []
    current: dict[str, Any] | None = None

    for line in text.splitlines():
        # New entry: [N] text
        match = re.match(r"^\[(\d+)\]\s+(.*)", line)
        if match:
            if current:
                memories.append(current)
            current = {"text": match.group(2)}
            continue

        # Metadata line:     key: value
        meta = re.match(r"^\s+(tag|category|created):\s+(.*)", line)
        if meta and current:
            current[meta.group(1)] = meta.group(2)
            continue

    if current:
        memories.append(current)

    return memories
