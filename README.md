###### WIP Computer

[![npm](https://img.shields.io/npm/v/memory-crystal)](https://www.npmjs.com/package/memory-crystal) [![CLI](https://img.shields.io/badge/interface-CLI-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/cli.ts) [![MCP Server](https://img.shields.io/badge/interface-MCP_Server-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/mcp-server.ts) [![OpenClaw Plugin](https://img.shields.io/badge/interface-OpenClaw_Plugin-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/openclaw.ts) [![Claude Code Hook](https://img.shields.io/badge/interface-Claude_Code_Hook-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/cc-hook.ts) [![Universal Interface Spec](https://img.shields.io/badge/Universal_Interface_Spec-black?style=flat&color=black)](https://github.com/wipcomputer/wip-universal-installer)

# Memory Crystal

## All your AI tools. One shared memory.

Stop starting over. Memory Crystal lets Claude, ChatGPT, OpenClaw, and Codex remember you ... together.

You use multiple AIs. They don't talk to each other. They don't remember what the others know.

You keep re-explaining yourself.

Have you ever thought to yourself ... ***why isn't this all connected?***

**Memory Crystal** fixes this.

***All your AIs share one memory. Searchable and private.***

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

## More Info

- [**Multi-Device Sync**](https://github.com/wipcomputer/memory-crystal/blob/main/RELAY.md) ... Your laptop and desktop share memory.
- [**Technical Documentation**](https://github.com/wipcomputer/memory-crystal/blob/main/TECHNICAL.md) ... How it works, architecture, search, encryption, design decisions.
- [**Memory Crystal for Enterprise**](https://github.com/wipcomputer/memory-crystal/blob/main/README-ENTERPRISE.md) ... On-prem deployment, agent isolation, compliance, and security.

---

## License

```
src/, skills/, cli.ts, mcp-server.ts   MIT    (use anywhere, no restrictions)
worker/                                AGPL   (relay server)
```

AGPL for personal use is free.

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code CLI (Claude Opus 4.6).

Search architecture inspired by [QMD](https://github.com/tobi/qmd) by Tobi Lutke (MIT, 2024-2026).
