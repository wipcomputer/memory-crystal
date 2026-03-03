// memory-crystal/bridge.ts — Bridge (lesa-bridge) detection and registration.
// Checks if the bridge MCP server is installed and registered with Claude Code.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const HOME = process.env.HOME || '';

// ── Detection ──

export function isBridgeInstalled(): boolean {
  try {
    execSync('which lesa 2>/dev/null', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

export function isBridgeRegistered(): boolean {
  // Check Claude Code MCP config
  const mcpPath = join(HOME, '.claude', '.mcp.json');
  try {
    if (existsSync(mcpPath)) {
      const config = JSON.parse(readFileSync(mcpPath, 'utf-8'));
      if (config.mcpServers && config.mcpServers['lesa-bridge']) return true;
    }
  } catch {}
  return false;
}

export function isBridgeDesktopRegistered(): boolean {
  const desktopConfig = join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  try {
    if (existsSync(desktopConfig)) {
      const config = JSON.parse(readFileSync(desktopConfig, 'utf-8'));
      if (config.mcpServers && config.mcpServers['lesa-bridge']) return true;
    }
  } catch {}
  return false;
}

// ── Registration ──

export function registerBridgeMcp(): void {
  execSync('claude mcp add --scope user lesa-bridge -- lesa', {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
}

export function registerBridgeDesktop(): boolean {
  const desktopConfig = join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  if (!existsSync(desktopConfig)) return false;

  try {
    const config = JSON.parse(readFileSync(desktopConfig, 'utf-8'));
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers['lesa-bridge'] = { command: 'lesa' };
    writeFileSync(desktopConfig, JSON.stringify(config, null, 2) + '\n');
    return true;
  } catch {
    return false;
  }
}
