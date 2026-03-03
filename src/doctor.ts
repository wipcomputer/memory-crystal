// memory-crystal/doctor.ts — Crystal Doctor: full health check.
// Runs 10 checks and returns status + fix suggestions.
//
// Usage: crystal doctor

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { detectRole } from './role.js';
import { ldmPaths, resolveStatePath } from './ldm.js';
import { isBridgeInstalled, isBridgeRegistered } from './bridge.js';

const HOME = process.env.HOME || '';

export interface DoctorCheck {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
  fix?: string;
}

export async function runDoctor(): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const role = detectRole();
  const paths = ldmPaths();

  // 1. Role
  checks.push({
    name: 'Role',
    status: 'ok',
    detail: `${role.role} (${role.source})`,
  });

  // 2. Database
  checks.push(await checkDatabase(paths.crystalDb));

  // 3. Embedding provider
  checks.push(checkEmbeddingProvider(role.role));

  // 4. Capture cron
  checks.push(checkCaptureCron());

  // 5. Relay config
  checks.push(checkRelayConfig(role));

  // 6. MCP server (memory-crystal)
  checks.push(checkMcpServer());

  // 7. Backup
  checks.push(checkBackup());

  // 8. Bridge
  checks.push(checkBridge());

  // 9. LDM directory
  checks.push(checkLdmDirectory(paths));

  // 10. Private mode
  checks.push(checkPrivateMode());

  return checks;
}

// ── Individual checks ──

async function checkDatabase(dbPath: string): Promise<DoctorCheck> {
  if (!existsSync(dbPath)) {
    return {
      name: 'Database',
      status: 'fail',
      detail: 'crystal.db not found',
      fix: 'crystal init',
    };
  }

  try {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as any;
    db.close();
    return {
      name: 'Database',
      status: 'ok',
      detail: `${row.count.toLocaleString()} chunks`,
    };
  } catch (err: any) {
    return {
      name: 'Database',
      status: 'warn',
      detail: `exists but could not read: ${err.message}`,
    };
  }
}

function checkEmbeddingProvider(role: string): DoctorCheck {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_API_KEY && process.env.CRYSTAL_EMBEDDING_PROVIDER === 'google';
  const hasOllama = process.env.CRYSTAL_EMBEDDING_PROVIDER === 'ollama';

  if (hasOpenAI || hasGoogle || hasOllama) {
    const provider = hasOllama ? 'ollama' : hasGoogle ? 'google' : 'openai';
    return {
      name: 'Embeddings',
      status: 'ok',
      detail: provider,
    };
  }

  // Nodes don't need local embeddings (Core handles it)
  if (role === 'node') {
    return {
      name: 'Embeddings',
      status: 'ok',
      detail: 'not needed (node mode, Core handles embeddings)',
    };
  }

  return {
    name: 'Embeddings',
    status: 'fail',
    detail: 'no embedding provider configured',
    fix: 'Set OPENAI_API_KEY, or CRYSTAL_EMBEDDING_PROVIDER=ollama',
  };
}

function checkCaptureCron(): DoctorCheck {
  try {
    const crontab = execSync('crontab -l 2>/dev/null', { encoding: 'utf-8' });
    if (crontab.includes('crystal-capture')) {
      return { name: 'Capture', status: 'ok', detail: 'cron installed' };
    }
  } catch {}

  return {
    name: 'Capture',
    status: 'warn',
    detail: 'cron not found',
    fix: 'crystal init',
  };
}

function checkRelayConfig(role: ReturnType<typeof detectRole>): DoctorCheck {
  if (role.role === 'standalone') {
    return { name: 'Relay', status: 'ok', detail: 'not needed (standalone)' };
  }

  if (role.role === 'node') {
    if (!role.relayUrl) {
      return { name: 'Relay', status: 'fail', detail: 'node mode but CRYSTAL_RELAY_URL not set', fix: 'Set CRYSTAL_RELAY_URL in shell profile' };
    }
    if (!role.relayToken) {
      return { name: 'Relay', status: 'fail', detail: 'node mode but CRYSTAL_RELAY_TOKEN not set', fix: 'Set CRYSTAL_RELAY_TOKEN in shell profile' };
    }
    if (!role.relayKeyExists) {
      return { name: 'Relay', status: 'fail', detail: 'encryption key not found', fix: 'crystal pair --code <string from Core>' };
    }
    return { name: 'Relay', status: 'ok', detail: `node -> ${role.relayUrl}` };
  }

  // Core
  if (!role.relayKeyExists) {
    return { name: 'Relay', status: 'warn', detail: 'Core mode but no relay key (no nodes can sync)', fix: 'crystal pair' };
  }
  return { name: 'Relay', status: 'ok', detail: 'Core with relay key' };
}

function checkMcpServer(): DoctorCheck {
  const mcpPath = join(HOME, '.claude', '.mcp.json');
  try {
    if (existsSync(mcpPath)) {
      const config = JSON.parse(readFileSync(mcpPath, 'utf-8'));
      if (config.mcpServers && config.mcpServers['memory-crystal']) {
        return { name: 'MCP Server', status: 'ok', detail: 'memory-crystal registered' };
      }
    }
  } catch {}

  return {
    name: 'MCP Server',
    status: 'warn',
    detail: 'memory-crystal not registered with Claude Code',
    fix: 'claude mcp add --scope user memory-crystal -- crystal-mcp',
  };
}

function checkBackup(): DoctorCheck {
  const plistPath = join(HOME, 'Library', 'LaunchAgents', 'ai.openclaw.ldm-backup.plist');
  if (existsSync(plistPath)) {
    return { name: 'Backup', status: 'ok', detail: 'LaunchAgent installed' };
  }

  // Check cron fallback
  try {
    const crontab = execSync('crontab -l 2>/dev/null', { encoding: 'utf-8' });
    if (crontab.includes('ldm-backup')) {
      return { name: 'Backup', status: 'ok', detail: 'cron installed' };
    }
  } catch {}

  return {
    name: 'Backup',
    status: 'warn',
    detail: 'not configured',
    fix: 'crystal backup setup',
  };
}

function checkBridge(): DoctorCheck {
  const installed = isBridgeInstalled();
  const registered = isBridgeRegistered();

  if (installed && registered) {
    return { name: 'Bridge', status: 'ok', detail: 'installed and registered' };
  }
  if (installed && !registered) {
    return { name: 'Bridge', status: 'warn', detail: 'installed but not registered', fix: 'crystal bridge setup' };
  }
  return {
    name: 'Bridge',
    status: 'warn',
    detail: 'not installed',
    fix: 'npm install -g lesa-bridge && crystal bridge setup',
  };
}

function checkLdmDirectory(paths: ReturnType<typeof ldmPaths>): DoctorCheck {
  const missing: string[] = [];
  if (!existsSync(paths.root)) missing.push('~/.ldm');
  if (!existsSync(join(paths.root, 'memory'))) missing.push('memory/');
  if (!existsSync(paths.state)) missing.push('state/');
  if (!existsSync(paths.bin)) missing.push('bin/');
  if (!existsSync(paths.transcripts)) missing.push('transcripts/');

  if (missing.length === 0) {
    return { name: 'LDM Directory', status: 'ok', detail: 'intact' };
  }

  return {
    name: 'LDM Directory',
    status: 'fail',
    detail: `missing: ${missing.join(', ')}`,
    fix: 'crystal init',
  };
}

function checkPrivateMode(): DoctorCheck {
  const statePath = resolveStatePath('memory-capture-state.json');
  try {
    if (existsSync(statePath)) {
      const state = JSON.parse(readFileSync(statePath, 'utf-8'));
      if (state.enabled === false) {
        return { name: 'Private Mode', status: 'warn', detail: 'capture disabled (private mode ON)' };
      }
    }
  } catch {}
  return { name: 'Private Mode', status: 'ok', detail: 'capture enabled' };
}
