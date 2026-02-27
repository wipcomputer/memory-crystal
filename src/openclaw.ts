// memory-crystal/openclaw.ts — OpenClaw plugin wrapper.
// Thin layer calling core.ts via api.registerTool() and api.on().
// Replaces context-embeddings plugin.

import { Crystal, resolveConfig, type Chunk } from './core.js';
import { runDevUpdate } from './dev-update.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG_DIR = join(process.env.HOME || '', '.openclaw');
const PRIVATE_MODE_PATH = join(CONFIG_DIR, 'memory', 'memory-capture-state.json');

function isPrivateMode(): boolean {
  try {
    if (existsSync(PRIVATE_MODE_PATH)) {
      const state = JSON.parse(readFileSync(PRIVATE_MODE_PATH, 'utf-8'));
      return state.enabled === false;
    }
  } catch {
    // corrupted file = default to enabled (capture on)
  }
  return false;
}

// getPrivateState and setPrivateMode moved to lesa-private-mode plugin.
// Only isPrivateMode() is needed here for agent_end and crystal_remember checks.

export default {
  register(api: any) {
    const crystal = new Crystal(resolveConfig());
    let initialized = false;

    async function ensureInit() {
      if (!initialized) {
        await crystal.init();
        initialized = true;
      }
    }

    // ── Hook: agent_end (continuous conversation ingestion) ──

    api.on('agent_end', async (event: any, ctx: any) => {
      // Private mode check
      if (isPrivateMode()) return;

      await ensureInit();

      const messages = event.messages;
      if (!messages || messages.length === 0) return;

      const agentId = ctx.agentId || 'main';
      const sessionKey = ctx.sessionKey || 'unknown';

      // Check capture state
      const state = crystal.getCaptureState(agentId, sessionKey);
      const storedCount = state.lastMessageCount;

      // Detect compaction: messages array shrank below stored counter
      let startIndex = storedCount;
      if (messages.length < storedCount) {
        api.logger.info(`memory-crystal: compaction detected (${storedCount} → ${messages.length} messages), resetting capture position`);
        startIndex = 0;
      }

      if (messages.length <= startIndex) return; // Nothing new

      // Extract new conversation turns
      const newTurns: Chunk[] = [];
      for (let i = startIndex; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg.content) continue;

        const role = msg.role;
        if (role !== 'user' && role !== 'assistant') continue;

        // Extract text from content (string or array)
        let text = '';
        if (typeof msg.content === 'string') {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          text = msg.content
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text)
            .join('\n');
        }

        if (!text || text.length < 50) continue; // Skip tiny messages

        // Turn-boundary chunking: one message = one chunk.
        // Only fall back to chunkText() for very long messages (>2000 tokens).
        const maxSingleChunkChars = 2000 * 4;
        if (text.length <= maxSingleChunkChars) {
          newTurns.push({
            text,
            role: role as 'user' | 'assistant',
            source_type: 'conversation',
            source_id: sessionKey,
            agent_id: agentId,
            token_count: Math.ceil(text.length / 4),
            created_at: new Date().toISOString(),
          });
        } else {
          // Very long message: chunk it, but preserve turn context
          const chunks = crystal.chunkText(text);
          for (const chunkText of chunks) {
            newTurns.push({
              text: chunkText,
              role: role as 'user' | 'assistant',
              source_type: 'conversation',
              source_id: sessionKey,
              agent_id: agentId,
              token_count: Math.ceil(chunkText.length / 4),
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      // Skip if not enough new content
      const totalTokens = newTurns.reduce((sum, c) => sum + c.token_count, 0);
      if (totalTokens < 500) return;

      // Ingest
      try {
        const count = await crystal.ingest(newTurns);
        crystal.setCaptureState(agentId, sessionKey, messages.length, state.captureCount + 1);
        api.logger.info(`memory-crystal: ingested ${count} chunks from ${sessionKey} (cycle ${state.captureCount + 1})`);
      } catch (err: any) {
        api.logger.error(`memory-crystal: ingest error: ${err.message}`);
      }
    });

    // ── Tools ──
    // OpenClaw expects { content: [{ type: "text", text }] } return format

    function toolResult(text: string, isError = false) {
      return {
        content: [{ type: 'text' as const, text }],
        ...(isError ? { isError: true } : {}),
      };
    }

    api.registerTool(
      {
        name: 'crystal_search',
        label: 'Search Memory Crystal',
        description: 'Search memory crystal — semantic search across all conversations and stored memories.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'What to search for' },
            limit: { type: 'number', description: 'Max results (default: 5)' },
            agent_id: { type: 'string', description: 'Filter by agent' },
          },
          required: ['query'],
        },
        async execute(_id: string, params: any) {
          try {
            await ensureInit();
            const results = await crystal.search(
              params.query,
              params.limit || 5,
              params.agent_id ? { agent_id: params.agent_id } : undefined
            );
            if (results.length === 0) return toolResult('No results found.');
            const formatted = results.map((r, i) => {
              const score = (r.score * 100).toFixed(1);
              const date = r.created_at?.slice(0, 10) || 'unknown';
              return `[${i + 1}] (${score}%, ${r.agent_id}, ${date}, ${r.role})\n${r.text}`;
            }).join('\n\n---\n\n');
            return toolResult(formatted);
          } catch (err: any) {
            return toolResult(`crystal_search error: ${err.message}`, true);
          }
        },
      },
      { optional: true }
    );

    api.registerTool(
      {
        name: 'crystal_remember',
        label: 'Remember in Crystal',
        description: 'Store a fact, preference, or observation in memory crystal.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The fact to remember' },
            category: { type: 'string', enum: ['fact', 'preference', 'event', 'opinion', 'skill'] },
          },
          required: ['text'],
        },
        async execute(_id: string, params: any) {
          // Private mode blocks explicit memory writes too
          if (isPrivateMode()) {
            return toolResult('Private mode is on. No memories are being stored. Use /private-mode off to resume.');
          }
          try {
            await ensureInit();
            const id = await crystal.remember(params.text, params.category || 'fact');
            return toolResult(`Remembered (id: ${id}): ${params.text}`);
          } catch (err: any) {
            return toolResult(`crystal_remember error: ${err.message}`, true);
          }
        },
      },
      { optional: true }
    );

    api.registerTool(
      {
        name: 'crystal_forget',
        label: 'Forget Memory',
        description: 'Deprecate a memory by ID.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Memory ID to deprecate' },
          },
          required: ['id'],
        },
        async execute(_id: string, params: any) {
          try {
            await ensureInit();
            const ok = crystal.forget(params.id);
            return toolResult(ok ? `Forgot memory ${params.id}` : `Memory ${params.id} not found`);
          } catch (err: any) {
            return toolResult(`crystal_forget error: ${err.message}`, true);
          }
        },
      },
      { optional: true }
    );

    // ── Hook: before_compaction (auto dev updates) ──

    api.on('before_compaction', (_event: any, _ctx: any) => {
      try {
        const result = runDevUpdate('lesa');
        if (result.reposUpdated > 0) {
          api.logger.info(`memory-crystal: auto-dev-update wrote ${result.reposUpdated} updates before compaction`);
        }
      } catch (err: any) {
        api.logger.warn(`memory-crystal: auto-dev-update failed: ${err.message}`);
      }
    });

    api.logger.info('memory-crystal plugin registered');
  }
};
