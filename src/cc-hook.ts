#!/usr/bin/env node
// memory-crystal/cc-hook.ts — Claude Code Stop hook handler.
// Triggered after every Claude Code response. Reads the session JSONL,
// extracts new turns since last watermark.
//
// Two modes:
//   LOCAL:  Ingests directly into local crystal (Mini)
//   RELAY:  Encrypts and drops at ephemeral relay Worker (Air/remote devices)
//
// Usage (Stop hook):
//   Receives JSON on stdin: { transcript_path, session_id, ... }
//
// Usage (CLI):
//   node cc-hook.js --on         Enable capture
//   node cc-hook.js --off        Disable capture
//   node cc-hook.js --status     Check state

import { Crystal, RemoteCrystal, resolveConfig, createCrystal, type Chunk } from './core.js';
import { loadRelayKey, encryptJSON } from './crypto.js';
import { ensureLdm, ldmPaths } from './ldm.js';
import {
  readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync,
  statSync, openSync, readSync, closeSync, copyFileSync,
} from 'node:fs';
import { join, basename, dirname } from 'node:path';

const HOME = process.env.HOME || '';
const CC_AGENT_ID = process.env.CRYSTAL_AGENT_ID || 'claude-code';
const RELAY_URL = process.env.CRYSTAL_RELAY_URL || '';
const RELAY_TOKEN = process.env.CRYSTAL_RELAY_TOKEN || '';
const OC_DIR = join(HOME, '.openclaw');
const LDM_DAILY = join(HOME, '.ldm', 'agents', 'cc', 'memory', 'daily');
const PRIVATE_MODE_PATH = join(OC_DIR, 'memory', 'memory-capture-state.json');
const WATERMARK_PATH = join(OC_DIR, 'memory', 'cc-capture-watermark.json');
const CC_ENABLED_PATH = join(OC_DIR, 'memory', 'cc-capture-enabled.json');

// ── Mode detection ──

type CaptureMode = 'local' | 'relay';

function getCaptureMode(): CaptureMode {
  if (RELAY_URL && RELAY_TOKEN) return 'relay';
  return 'local';
}

// ── Private mode (shared with Lēsa's system) ──

function isPrivateMode(): boolean {
  try {
    if (existsSync(PRIVATE_MODE_PATH)) {
      const state = JSON.parse(readFileSync(PRIVATE_MODE_PATH, 'utf-8'));
      return state.enabled === false;
    }
  } catch {}
  return false;
}

// ── CC capture on/off switch ──

function isCaptureEnabled(): boolean {
  try {
    if (existsSync(CC_ENABLED_PATH)) {
      const state = JSON.parse(readFileSync(CC_ENABLED_PATH, 'utf-8'));
      return state.enabled !== false;
    }
  } catch {}
  return true; // Default: on
}

function setCaptureEnabled(enabled: boolean): void {
  const dir = dirname(CC_ENABLED_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CC_ENABLED_PATH, JSON.stringify({
    enabled,
    updatedAt: new Date().toISOString(),
  }, null, 2));
}

// ── Watermark ──

interface Watermark {
  files: Record<string, { lastByteOffset: number; lastTimestamp: string }>;
  lastRun: string | null;
}

function loadWatermark(): Watermark {
  try {
    if (existsSync(WATERMARK_PATH)) {
      return JSON.parse(readFileSync(WATERMARK_PATH, 'utf-8'));
    }
  } catch {}
  return { files: {}, lastRun: null };
}

function saveWatermark(wm: Watermark): void {
  const dir = dirname(WATERMARK_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  wm.lastRun = new Date().toISOString();
  writeFileSync(WATERMARK_PATH, JSON.stringify(wm, null, 2));
}

// ── JSONL parsing ──

interface ExtractedMessage {
  role: string;
  text: string;
  timestamp: string;
  sessionId: string;
}

function extractMessages(filePath: string, lastByteOffset: number): {
  messages: ExtractedMessage[];
  newByteOffset: number;
} {
  const fileSize = statSync(filePath).size;
  if (lastByteOffset >= fileSize) {
    return { messages: [], newByteOffset: fileSize };
  }

  const fd = openSync(filePath, 'r');
  const bufSize = fileSize - lastByteOffset;
  const buf = Buffer.alloc(bufSize);
  readSync(fd, buf, 0, bufSize, lastByteOffset);
  closeSync(fd);

  const lines = buf.toString('utf-8').split('\n').filter(Boolean);
  const messages: ExtractedMessage[] = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.type !== 'user' && obj.type !== 'assistant') continue;

      const msg = obj.message;
      if (!msg) continue;

      let text = '';
      if (typeof msg.content === 'string') {
        text = msg.content;
      } else if (Array.isArray(msg.content)) {
        const parts: string[] = [];
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) parts.push(block.text);
          if (block.type === 'thinking' && block.thinking) parts.push(`[thinking] ${block.thinking}`);
        }
        text = parts.join('\n\n');
      }

      if (text.length < 20) continue;

      messages.push({
        role: msg.role || obj.type,
        text,
        timestamp: obj.timestamp || new Date().toISOString(),
        sessionId: obj.sessionId || 'unknown',
      });
    } catch {}
  }

  return { messages, newByteOffset: fileSize };
}

// ── JSONL transcript archive ──

function archiveTranscript(transcriptPath: string, agentId?: string): void {
  try {
    if (isPrivateMode()) return;
    const paths = ensureLdm(agentId);
    const dest = join(paths.transcripts, basename(transcriptPath));
    // Only copy if source is newer than destination (mtime check)
    if (existsSync(dest)) {
      const srcMtime = statSync(transcriptPath).mtimeMs;
      const dstMtime = statSync(dest).mtimeMs;
      if (srcMtime <= dstMtime) return;
    }
    // copyFileSync imported at top of file
    copyFileSync(transcriptPath, dest);
  } catch {} // Non-fatal
}

// archiveTranscript: copies JSONL to ~/.ldm/agents/{id}/transcripts/
// Called early in main(), after kill-switch checks, before watermark logic.

// ── Daily log breadcrumb ──

function appendDailyLog(messages: ExtractedMessage[], agentId?: string): void {
  try {
    const paths = ldmPaths(agentId);
    if (!existsSync(paths.root)) return; // LDM not scaffolded
    if (!existsSync(paths.daily)) mkdirSync(paths.daily, { recursive: true });

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Los_Angeles',
    });
    const logPath = join(paths.daily, `${dateStr}.md`);

    // Extract first user message as snippet
    const userMsg = messages.find(m => m.role === 'user');
    if (!userMsg) return;
    const snippet = userMsg.text.slice(0, 120).replace(/\n/g, ' ').trim();

    const line = `- **${timeStr}** ${snippet}${userMsg.text.length > 120 ? '...' : ''}\n`;

    // Create file with header if new
    if (!existsSync(logPath)) {
      writeFileSync(logPath, `# ${dateStr} - CC Daily Log\n\n`);
    }

    appendFileSync(logPath, line);
  } catch {} // Fail silently
}

// ── Relay mode: encrypt and drop at Worker ──

async function dropAtRelay(messages: ExtractedMessage[]): Promise<number> {
  const relayKey = loadRelayKey();

  // Package messages for relay
  const payload = {
    agent_id: CC_AGENT_ID,
    dropped_at: new Date().toISOString(),
    messages: messages.map(m => ({
      text: m.text,
      role: m.role,
      timestamp: m.timestamp,
      sessionId: m.sessionId,
    })),
  };

  // Encrypt
  const encrypted = encryptJSON(payload, relayKey);
  const body = JSON.stringify(encrypted);

  // Drop at Worker with retry
  let retries = 0;
  while (retries < 4) {
    try {
      const resp = await fetch(`${RELAY_URL}/drop/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RELAY_TOKEN}`,
          'Content-Type': 'application/octet-stream',
        },
        body,
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Relay drop failed: ${resp.status} ${err}`);
      }

      const result = await resp.json() as any;
      return messages.length;
    } catch (err: any) {
      retries++;
      if (retries >= 4) throw err;
      const delay = Math.min(1000 * 2 ** retries, 30000);
      process.stderr.write(`  [relay retry ${retries}] ${err.message}, waiting ${delay}ms\n`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return 0;
}

// ── Local mode: direct ingest with batched retry ──

const BATCH_SIZE = 200;

async function ingestLocal(messages: ExtractedMessage[]): Promise<number> {
  const config = resolveConfig();
  const crystal = createCrystal(config);
  await crystal.init();

  // Turn-boundary chunking: one message = one chunk.
  // Only fall back to chunkText() for very long messages (>2000 tokens).
  const maxSingleChunkChars = 2000 * 4;
  const chunks: Chunk[] = [];
  for (const msg of messages) {
    if (msg.text.length <= maxSingleChunkChars) {
      chunks.push({
        text: msg.text,
        role: msg.role as 'user' | 'assistant',
        source_type: 'conversation',
        source_id: `cc:${msg.sessionId}`,
        agent_id: CC_AGENT_ID,
        token_count: Math.ceil(msg.text.length / 4),
        created_at: msg.timestamp,
      });
    } else {
      for (const ct of crystal.chunkText(msg.text)) {
        chunks.push({
          text: ct,
          role: msg.role as 'user' | 'assistant',
          source_type: 'conversation',
          source_id: `cc:${msg.sessionId}`,
          agent_id: CC_AGENT_ID,
          token_count: Math.ceil(ct.length / 4),
          created_at: msg.timestamp,
        });
      }
    }
  }

  // Batched ingest with retry
  let total = 0;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    let retries = 0;
    while (retries < 4) {
      try {
        total += await crystal.ingest(batch);
        break;
      } catch (err: any) {
        retries++;
        if (retries >= 4) throw err;
        const delay = Math.min(1000 * 2 ** retries, 30000);
        process.stderr.write(`  [retry ${retries}] ${err.message}, waiting ${delay}ms\n`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return total;
}

// ── CLI commands ──

const args = process.argv.slice(2);

if (args.includes('--on')) {
  setCaptureEnabled(true);
  console.log('(*) Claude Code memory capture ON');
  process.exit(0);
}

if (args.includes('--off')) {
  setCaptureEnabled(false);
  console.log('( ) Claude Code memory capture OFF');
  process.exit(0);
}

if (args.includes('--status')) {
  const mode = getCaptureMode();
  console.log(isCaptureEnabled() ? '(*) CC capture: ON' : '( ) CC capture: OFF');
  console.log(isPrivateMode() ? '( ) Private mode: ON (blocks all capture)' : '(*) Private mode: OFF');
  console.log(`    Mode: ${mode}${mode === 'relay' ? ` (${RELAY_URL})` : ''}`);
  console.log(`    Agent ID: ${CC_AGENT_ID}`);
  process.exit(0);
}

// ── Stop hook handler ──

async function main(): Promise<void> {
  // Read hook JSON from stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData: any;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const transcriptPath = hookData.transcript_path;
  if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0);

  // Kill switches
  if (isPrivateMode() || !isCaptureEnabled()) process.exit(0);

  // Archive JSONL transcript to LDM (copy if newer)
  archiveTranscript(transcriptPath);

  const wm = loadWatermark();
  const fileKey = transcriptPath;

  // First time: seed watermark at current size (skip old history)
  if (!wm.files[fileKey]) {
    const size = statSync(transcriptPath).size;
    wm.files[fileKey] = { lastByteOffset: size, lastTimestamp: new Date().toISOString() };
    saveWatermark(wm);
    process.stderr.write(`[cc-memory-capture] seeded ${basename(transcriptPath)} at ${size} bytes\n`);
    process.exit(0);
  }

  const lastOffset = wm.files[fileKey].lastByteOffset || 0;
  const { messages, newByteOffset } = extractMessages(transcriptPath, lastOffset);

  if (messages.length === 0) {
    wm.files[fileKey] = { lastByteOffset: newByteOffset, lastTimestamp: new Date().toISOString() };
    saveWatermark(wm);
    process.exit(0);
  }

  const totalTokens = messages.reduce((sum, m) => sum + Math.ceil(m.text.length / 4), 0);

  // Min threshold
  if (totalTokens < 500) {
    wm.files[fileKey] = { lastByteOffset: newByteOffset, lastTimestamp: new Date().toISOString() };
    saveWatermark(wm);
    process.exit(0);
  }

  const mode = getCaptureMode();

  try {
    if (mode === 'relay') {
      // Relay mode: encrypt and drop at Worker
      const count = await dropAtRelay(messages);
      process.stderr.write(`[cc-memory-capture] relayed ${count} messages (${totalTokens} tokens) from ${basename(transcriptPath)}\n`);
    } else {
      // Local mode: direct ingest into crystal
      const count = await ingestLocal(messages);
      process.stderr.write(`[cc-memory-capture] ${count} chunks (${totalTokens} tokens) from ${basename(transcriptPath)}\n`);
    }

    wm.files[fileKey] = { lastByteOffset: newByteOffset, lastTimestamp: new Date().toISOString() };
    saveWatermark(wm);

    // Append breadcrumb to LDM daily log
    appendDailyLog(messages);

    // Generate MD session summary (non-fatal)
    try {
      const { generateSessionSummary, writeSummaryFile } = await import('./summarize.js');
      const paths = ldmPaths();
      const summaryMsgs = messages.map(m => ({ role: m.role, text: m.text, timestamp: m.timestamp, sessionId: m.sessionId }));
      const summary = await generateSessionSummary(summaryMsgs);
      const sessionId = messages[0]?.sessionId || 'unknown';
      const agentId = process.env.CRYSTAL_AGENT_ID || 'cc-mini';
      writeSummaryFile(paths.sessions, summary, agentId, sessionId);
    } catch {} // Summary failure is non-fatal

    // Auto dev updates (local mode only — Mini handles this)
    if (mode === 'local') {
      try {
        const { runDevUpdate } = await import('./dev-update.js');
        const result = runDevUpdate('cc');
        if (result.reposUpdated > 0) {
          process.stderr.write(`[cc-dev-update] wrote ${result.reposUpdated} dev updates\n`);
        }
      } catch (devErr: any) {
        process.stderr.write(`[cc-dev-update] failed (non-fatal): ${devErr.message}\n`);
      }
    }
  } catch (err: any) {
    process.stderr.write(`[cc-memory-capture] error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
