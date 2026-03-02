---
name: memory
description: Search and manage the shared memory crystal. Use when user says "do you remember", "search memory", "remember this", "forget that", "memory status", "what do you know about", or needs to recall past discussions, store facts, or check what's in memory.
version: 0.3.1
---

# Memory Crystal

All your AIs share one memory. Searchable, private, sovereign. Every conversation you have with any AI gets captured, embedded, and made searchable. Facts, preferences, and decisions persist across sessions and across tools.

## What it does

1. **Captures** every conversation automatically (cron job, every minute)
2. **Embeds** conversation chunks for semantic search (OpenAI, Ollama, or Google embeddings)
3. **Searches** across all your AI conversations with ranked, recency-weighted results
4. **Stores** facts, preferences, and decisions you want to keep permanently
5. **Works across** Claude Code CLI, Claude Desktop, OpenClaw, and any MCP-compatible client

## What changes for the user

After install, the AI remembers everything. Past conversations are searchable. Important facts persist. The user never has to re-explain context. Every AI tool they use shares the same memory.

---

## Install

**You are an AI agent helping a user install Memory Crystal. Follow these steps exactly. The user should not need to do anything technical. You do it all.**

### Step 1: Install the package

Run this:

```bash
npm install -g memory-crystal
```

If npm is not available, check if the user has Node.js installed (`node --version`). They need Node.js 20+. If not installed, tell them to install it from https://nodejs.org first.

### Step 2: Set up embeddings

Memory Crystal needs an embedding provider to make conversations searchable. Check if the user already has one:

```bash
echo $OPENAI_API_KEY
```

If that returns a key, you're good. Skip to Step 3.

If not, ask the user which provider they want:

**Option A: OpenAI (recommended, requires API key)**
Tell the user to add this to their shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
export OPENAI_API_KEY="sk-..."
```
They get the key from https://platform.openai.com/api-keys

**Option B: Ollama (free, local, no API key needed)**
```bash
# Check if Ollama is installed
ollama --version
# If not, tell them: https://ollama.com
ollama pull nomic-embed-text
```
Then add to shell profile:
```bash
export CRYSTAL_EMBEDDING_PROVIDER=ollama
```

**Option C: Google**
```bash
export CRYSTAL_EMBEDDING_PROVIDER=google
export GOOGLE_API_KEY="..."
```

### Step 3: Connect to your AI

**Detect what the user is running and install for all of them.** Check for each:

#### Claude Code CLI

If the user is talking to you through Claude Code CLI (you are running as `claude`), install the MCP server:

```bash
claude mcp add --scope user memory-crystal -- crystal-mcp
```

Then restart Claude Code (the user needs to exit and re-open, or run `/mcp` to reconnect).

After restart, you will have these tools: `crystal_search`, `crystal_remember`, `crystal_forget`, `crystal_status`.

#### Claude Desktop (macOS app)

Check if Claude Desktop is installed:

```bash
ls ~/Library/Application\ Support/Claude/claude_desktop_config.json 2>/dev/null
```

If it exists, read the file and add the memory-crystal MCP server to it:

```json
{
  "mcpServers": {
    "memory-crystal": {
      "command": "crystal-mcp"
    }
  }
}
```

Merge this into the existing config (don't overwrite other servers). Tell the user to restart Claude Desktop.

#### OpenClaw

Check if OpenClaw is installed:

```bash
which openclaw 2>/dev/null || ls ~/.openclaw/openclaw.json 2>/dev/null
```

If OpenClaw is present, install Memory Crystal as a plugin:

```bash
openclaw plugins install memory-crystal
openclaw gateway restart
```

**Important: if you detect multiple runtimes, install for ALL of them.** They share the same database. Tell the user: "I found Claude Code and OpenClaw on your system. I'm installing Memory Crystal for both so all your AIs share the same memory."

### Step 4: Initialize

```bash
crystal init
```

This scaffolds the `~/.ldm/` directory, deploys the capture script, and installs a cron job that captures conversations every minute. Safe to run multiple times.

### Step 5: Verify

Run `crystal_status` (if you have the MCP tool) or:

```bash
crystal status
```

It should show the data directory, provider, and chunk count. If chunks are 0, that's normal for a fresh install. They appear within a minute.

Test search:

```bash
crystal search "test"
```

If that works, tell the user: "Memory Crystal is installed. From now on, I can search our past conversations, remember important things, and share memory with your other AI tools. Try asking me 'do you remember what we talked about last week?'"

---

## Tools

Once installed, these tools are available to the AI:

### crystal_search

Search across all stored memory. Semantic search with recency-weighted results.

```
crystal_search query="how do plugins work" limit=5
crystal_search query="user preferences" agent_id="main"
```

Results are ranked by relevance and freshness, with color-coded freshness indicators:
- 🟢 fresh (less than 3 days)
- 🟡 recent (less than 7 days)
- 🟠 aging (less than 14 days)
- 🔴 stale (14+ days)

### crystal_remember

Store a fact or observation that persists across sessions.

```
crystal_remember text="User prefers Opus for complex tasks" category="preference"
crystal_remember text="API key rotated on 2026-03-01" category="event"
```

Categories: fact, preference, event, opinion, skill

### crystal_forget

Deprecate a stored memory by ID (marks as deprecated, doesn't delete).

```
crystal_forget id=42
```

### crystal_status

Check memory health: chunk count, agents, provider, data directory.

```
crystal_status
```

---

## Tips

- Search is semantic. "how do plugins work" finds conversations about plugin architecture even if those exact words weren't used.
- Store preferences and decisions as memories. They survive compaction and context limits.
- Use `agent_id` filter when you only want results from a specific agent.
- The cron job captures conversations every minute. No data loss even in long sessions.
- Available providers: openai (default), ollama (local, free), google.
- All runtimes (Claude Code, Claude Desktop, OpenClaw) share the same database at `~/.ldm/memory/crystal.db`.
