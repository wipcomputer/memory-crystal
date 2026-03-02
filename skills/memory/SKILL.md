---
name: memory
description: Search and manage the shared memory crystal. Use when user says "do you remember", "search memory", "remember this", "forget that", "memory status", "what do you know about", or needs to recall past discussions, store facts, or check what's in memory.
---

# Memory Crystal Skill

## When to use
- Searching for past conversations, decisions, or context
- Storing important facts, preferences, or observations that should persist
- Checking what's in memory and how much is stored

## Tools

### crystal_search
Search across all stored memory — conversations, files, manually stored facts.

```
crystal_search query="OpenAI API key configuration" limit=5
crystal_search query="Parker's preferences" agent_id="main"
```

### crystal_remember
Store a fact or observation that should persist across sessions.

```
crystal_remember text="Parker prefers Opus for complex tasks, Sonnet for quick ones" category="preference"
crystal_remember text="Gateway auth token is required since v2026.2.2" category="fact"
```

Categories: fact, preference, event, opinion, skill

### crystal_forget
Deprecate a stored memory by ID (doesn't delete — marks as deprecated).

```
crystal_forget id=42
```

### crystal_status
Check memory crystal health — chunk count, agents, provider.

```
crystal_status
```

## Setup

```bash
crystal init                    # Scaffolds ~/.ldm/, deploys capture script, installs cron
crystal init --agent cc-air     # Use a different agent ID
```

This creates the `~/.ldm/` directory tree, copies `crystal-capture.sh` to `~/.ldm/bin/`, and installs a cron job that captures conversations every minute. The Stop hook (`cc-hook.ts`) is optional redundancy.

## CLI (via bash)
```bash
crystal search "query"
crystal search "query" -n 10 --agent main
crystal remember "fact to store" --category preference
crystal forget 42
crystal status
crystal status --provider ollama  # check with different provider
crystal init                      # scaffold + deploy capture + install cron
```

## Tips
- Search is semantic — "how do plugins work" will find conversations about plugin architecture even if those exact words weren't used
- Store preferences and decisions as memories — they survive compaction
- Use agent_id filter when you only want results from a specific agent
- Available providers: openai (default), ollama (local, free), google
