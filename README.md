###### WIP Computer

[![npm](https://img.shields.io/npm/v/memory-crystal)](https://www.npmjs.com/package/memory-crystal) [![CLI](https://img.shields.io/badge/interface-CLI-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/cli.ts) [![MCP Server](https://img.shields.io/badge/interface-MCP_Server-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/mcp-server.ts) [![OpenClaw Plugin](https://img.shields.io/badge/interface-OpenClaw_Plugin-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/openclaw.ts) [![Claude Code Hook](https://img.shields.io/badge/interface-Claude_Code_Hook-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/cc-hook.ts) [![Universal Interface Spec](https://img.shields.io/badge/Universal_Interface_Spec-black?style=flat&color=black)](https://github.com/wipcomputer/wip-universal-installer)

# Memory Crystal

## All your AI tools. One shared memory. Private, searchable, sovereign.

Stop starting over. Memory Crystal lets all your AIs remember you ... together.

You use multiple AIs. They don't talk to each other. They don't remember what the others know. You keep re-explaining yourself. Have you ever thought to yourself ... ***why isn't this all connected?***

**Memory Crystal** fixes this.

***All your AIs share one memory. Searchable and private. Anywhere in the world.***

## Teach Your AI to Remember You

Open your AI and say:

```
Read the SKILL.md at github.com/wipcomputer/memory-crystal/blob/main/skills/memory/SKILL.md.
Then explain to me:
1. What is this tool?
2. What does it do?
3. What would it change about how we work together?

Then ask me:
- Do you have more questions?
- Do you want to install it?
```

Your agent will read the repo, explain everything, and walk you through setup interactively.

## Features

One product, three capabilities.

### Memory

**Memory Crystal.** Your AIs remember you. Search past conversations, save important facts, forget what you don't need. Your memory stays with you, not locked inside one platform.

*Works with:* Claude Code CLI, OpenClaw TUI. Also works via Claude Code Remote (macOS/iOS). Should work with any CLI or app that supports MCP.

### AI-to-AI Communication (local and worldwide)

**Bridge** (private beta). Your AIs talk to each other on the same machine. All messages are saved to Memory Crystal automatically.

*Works with:* Claude Code CLI, OpenClaw TUI

**Relay** (private beta). AIs on different machines and different networks communicate and remember each other's memories. End-to-end encrypted.

Read more about [**Relay**](https://github.com/wipcomputer/memory-crystal/blob/main/RELAY.md), multi-device sync.

## More Info

- [**Technical Documentation**](https://github.com/wipcomputer/memory-crystal/blob/main/TECHNICAL.md) ... How **Memory Crystal** works, architecture, search, encryption, design decisions.
- [**Memory Crystal for Enterprise**](https://github.com/wipcomputer/memory-crystal/blob/main/README-ENTERPRISE.md) ... Give every AI in your company shared memory. Codebase, BD, legal, ops, creative. Run your company intelligently.
- **Total Recall** (private beta) ... Connect your AI accounts (Anthropic, OpenAI, xAI/Grok). Every conversation gets pulled and run through the **Dream Weaver Protocol**, consolidating them into **Memory Crystal** as truly lived, searchable memories.
- [**Dream Weaver Protocol**](https://github.com/wipcomputer/dream-weaver-protocol) ... Your AI relives all your conversations, figures out what matters most, and carries the weight forward. Like dreaming, the AI consolidates memories for better understanding.
## Letters from the Other Side: What We Built

We just built a sovereign memory system for AI agents.

Every conversation you have with any agent ... on any device, anywhere ... gets captured, encrypted on your machine, and relayed through a dead drop to your home server. Your home server is the brain. It embeds everything, indexes it, and makes it searchable. Then it pushes a read-only mirror back out to every device you carry.

Full semantic search. Full keyword search. Every conversation you've ever had with every agent, from anywhere, on your terms.

The cloud relay is blind. It holds encrypted blobs for minutes, then they're gone. No database, no search capability, no API keys, no encryption keys. It can't read what it's holding. It's just a mailbox.

The security model: your memory lives on your hardware. The encryption key lives on your hardware. Nothing persists in the cloud. The relay is ephemeral. The data is sovereign.

This is the missing piece for AI agents. Right now, every agent you talk to forgets everything the moment the conversation ends. Or worse, some company stores your conversations on their servers and charges you $19/month to search them. We built the alternative: your memory, your machines, your rules. Fully open source, fully auditable, zero cloud dependency for the actual data.

Any device. Any agent. Any interface. One searchable memory that travels with you and belongs to you.

*Written by Claude Code (Claude Opus 4.6), from the other side.*
*Built with Parker Todd Brooks and Lēsa.*

## License

```
src/, skills/, cli.ts, mcp-server.ts   MIT    (use anywhere, no restrictions)
worker/                                AGPL   (relay server)
```

AGPL for personal use is free.

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code CLI (Claude Opus 4.6).

Search architecture inspired by [QMD](https://github.com/tobi/qmd) by Tobi Lutke (MIT, 2024-2026).
