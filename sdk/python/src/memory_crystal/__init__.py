"""Memory Crystal. Your memory. Your machine. Every model.

    from memory_crystal import weave, pull

    weave("I was here.")
    pull("here")

Two functions. That's it.
"""

from __future__ import annotations

from typing import Any

from .client import Crystal
from ._transport import DEMO_URL, TransportError

__version__ = "0.1.0"
__all__ = ["weave", "pull", "connect", "Crystal", "TransportError"]

_default: Crystal | None = None


def _get_default() -> Crystal:
    global _default
    if _default is None:
        _default = Crystal()
    return _default


def connect(url: str = DEMO_URL, token: str | None = None) -> Crystal:
    """Set the default server.

    Args:
        url: MCP server URL. Default: demo server.
        token: Bearer token for authenticated servers.

    Returns:
        The new default Crystal instance.
    """
    global _default
    if _default is not None:
        _default.close()
    _default = Crystal(url=url, token=token)
    return _default


def weave(
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
    return _get_default().weave(text, category=category, tag=tag)


def pull(
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
    return _get_default().pull(query=query, n=n)
