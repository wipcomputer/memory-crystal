"""Streamable HTTP transport for MCP servers.

Handles JSON-RPC 2.0 over POST with SSE responses.
No MCP SDK dependency. Just httpx.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

DEMO_URL = "https://memory-crystal-demo.wipcomputer.workers.dev/mcp"

MCP_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}


class TransportError(Exception):
    """Raised when the MCP transport fails."""
    pass


class StreamableHTTPTransport:
    """Minimal MCP Streamable HTTP client.

    Speaks JSON-RPC 2.0 over POST. Parses SSE responses.
    Manages session lifecycle via mcp-session-id header.
    """

    def __init__(self, url: str = DEMO_URL, token: str | None = None):
        self.url = url
        self.token = token
        self.session_id: str | None = None
        self._request_id = 0
        self._client = httpx.Client(timeout=30.0)

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    def initialize(self) -> dict[str, Any]:
        """Send MCP initialize handshake. Must be called before any tool calls."""
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "clientInfo": {"name": "memory-crystal-py", "version": "0.1.0"},
                "capabilities": {},
            },
        }

        headers = dict(MCP_HEADERS)
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        response = self._client.post(self.url, json=payload, headers=headers)

        if response.status_code not in (200, 201):
            raise TransportError(
                f"Initialize failed: {response.status_code} {response.text[:200]}"
            )

        # Capture session ID from response header
        sid = response.headers.get("mcp-session-id")
        if sid:
            self.session_id = sid

        return self._parse_response(response)

    def request(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        """Send a JSON-RPC request and return the parsed result."""
        if self.session_id is None:
            self.initialize()

        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
            "params": params or {},
        }

        headers = dict(MCP_HEADERS)
        if self.session_id:
            headers["mcp-session-id"] = self.session_id
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        response = self._client.post(self.url, json=payload, headers=headers)

        if response.status_code not in (200, 201):
            raise TransportError(
                f"Request failed: {response.status_code} {response.text[:200]}"
            )

        return self._parse_response(response)

    def _parse_response(self, response: httpx.Response) -> dict[str, Any]:
        """Parse response. Handles both direct JSON and SSE formats."""
        content_type = response.headers.get("content-type", "")

        # Direct JSON response
        if "application/json" in content_type:
            data = response.json()
            if "error" in data:
                raise TransportError(
                    f"Server error: {data['error'].get('message', data['error'])}"
                )
            return data.get("result", data)

        # SSE response: parse data lines
        if "text/event-stream" in content_type:
            return self._parse_sse(response.text)

        # Try JSON anyway
        try:
            data = response.json()
            if "error" in data:
                raise TransportError(
                    f"Server error: {data['error'].get('message', data['error'])}"
                )
            return data.get("result", data)
        except (json.JSONDecodeError, ValueError):
            raise TransportError(f"Unexpected response format: {content_type}")

    def _parse_sse(self, text: str) -> dict[str, Any]:
        """Parse Server-Sent Events, return the last JSON-RPC result."""
        last_result = None

        for line in text.splitlines():
            if not line.startswith("data:"):
                continue
            data_str = line[5:].strip()
            if not data_str:
                continue
            try:
                data = json.loads(data_str)
                if "error" in data:
                    raise TransportError(
                        f"Server error: {data['error'].get('message', data['error'])}"
                    )
                if "result" in data:
                    last_result = data["result"]
            except json.JSONDecodeError:
                continue

        if last_result is None:
            raise TransportError("No valid JSON-RPC result in SSE response")

        return last_result

    def close(self):
        """Close the HTTP client."""
        self._client.close()
