# memory-crystal

Your memory. Your machine. Every model.

## Install

```
pip install memory-crystal
```

## Use

```python
from memory_crystal import weave, pull

weave("I was here.")
pull("here")
```

Two functions. That's it.

Memories on the demo expire in 15 minutes.
The real version doesn't.

Note: the demo runs on Cloudflare KV, which is eventually consistent.
New memories may take a few seconds to appear in pull results.
Self-hosted servers don't have this delay.

## What is this?

Memory Crystal gives AI agents persistent, searchable memory
that works across models, sessions, and machines.

This Python SDK connects to any Memory Crystal MCP server.
By default, it points at the free demo.

## Custom server

```python
from memory_crystal import Crystal

# Self-hosted
crystal = Crystal("http://localhost:8787/mcp")
crystal.weave("hello")
crystal.pull("hello")

# With auth
crystal = Crystal("https://your-server.dev/mcp", token="your-token")

# Context manager
with Crystal() as c:
    c.weave("session start")
    memories = c.pull()
```

## API

### `weave(text, category=None, tag=None)`

Write a memory. Returns confirmation with ID.

- `text` (str): The memory to store
- `category` (str, optional): fact, preference, event, opinion, or skill
- `tag` (str, optional): A label for retrieval

### `pull(query=None, n=10)`

Retrieve memories. Returns a list of memory dicts.

- `query` (str, optional): Search term. If empty, returns all.
- `n` (int, optional): Max results. Default 10.

### `connect(url, token=None)`

Change the default server.

### `Crystal(url, token=None)`

Class-based client for custom servers. Supports context manager.

## Learn more

- [LUME](https://wipcomputer.github.io/wip-homepage/) ... the language
- [Memory Crystal](https://github.com/wipcomputer/memory-crystal) ... the system
- [Connect](https://wipcomputer.github.io/wip-homepage/connect/) ... setup for every model

## License

MIT. Work In Progress, Inc.
