#!/usr/bin/env node
// memory-crystal/cli.ts — Universal CLI interface.
// crystal search "query" | crystal remember "fact" | crystal forget <id> | crystal status

import { Crystal, resolveConfig } from './core.js';
import { scaffoldLdm, ldmPaths, ensureLdm, getAgentId } from './ldm.js';
import { existsSync, copyFileSync, symlinkSync, lstatSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const USAGE = `
crystal — Sovereign memory system

Commands:
  crystal search <query> [-n limit] [--agent <id>] [--provider <openai|ollama|google>]
  crystal remember <text> [--category fact|preference|event|opinion|skill]
  crystal forget <id>
  crystal status [--provider <openai|ollama|google>]

  crystal sources add <path> --name <name>    Add a directory for source indexing
  crystal sources sync <name> [--dry-run]     Sync (re-index changed files)
  crystal sources status                      Show all indexed collections
  crystal sources remove <name>               Remove a collection

  crystal init [--agent <id>]                 Scaffold ~/.ldm/ directory tree
  crystal migrate-db                          Move crystal.db to ~/.ldm/memory/

Environment:
  CRYSTAL_EMBEDDING_PROVIDER   openai | ollama | google (default: openai)
  CRYSTAL_OLLAMA_HOST          Ollama URL (default: http://localhost:11434)
  CRYSTAL_REMOTE_URL           Worker URL for cloud mirror mode
  CRYSTAL_REMOTE_TOKEN         Auth token for cloud mirror
  CRYSTAL_AGENT_ID             Agent identifier (default: cc-mini)
`.trim();

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  const command = args[0];

  // Parse flags
  const flags: Record<string, string> = {};
  let positional: string[] = [];
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      flags['dry-run'] = 'true';
    } else if (args[i].startsWith('--') || args[i] === '-n') {
      const key = args[i].replace(/^-+/, '');
      flags[key] = args[++i] || '';
    } else {
      positional.push(args[i]);
    }
  }

  // Commands that don't need Crystal: handle before init
  if (command === 'init' || command === 'migrate-db') {
    await handleLdmCommand(command, flags);
    return;
  }

  const overrides: any = {};
  if (flags.provider) overrides.embeddingProvider = flags.provider;

  const config = resolveConfig(overrides);
  const crystal = new Crystal(config);
  await crystal.init();

  try {
    switch (command) {
      case 'search': {
        const query = positional.join(' ');
        if (!query) { console.error('Usage: crystal search <query>'); process.exit(1); }
        const limit = parseInt(flags.n || '5', 10);
        const filter: any = {};
        if (flags.agent) filter.agent_id = flags.agent;

        const results = await crystal.search(query, limit, filter);
        if (results.length === 0) {
          console.log('No results found.');
        } else {
          for (const r of results) {
            const score = (r.score * 100).toFixed(1);
            const date = r.created_at?.slice(0, 10) || 'unknown';
            console.log(`[${score}%] [${r.agent_id}] [${date}] [${r.role}]`);
            console.log(r.text.slice(0, 300) + (r.text.length > 300 ? '...' : ''));
            console.log('---');
          }
        }
        break;
      }

      case 'remember': {
        const text = positional.join(' ');
        if (!text) { console.error('Usage: crystal remember <text>'); process.exit(1); }
        const category = (flags.category || 'fact') as any;
        const id = await crystal.remember(text, category);
        console.log(`Remembered (id: ${id}, category: ${category}): ${text}`);
        break;
      }

      case 'forget': {
        const id = parseInt(positional[0], 10);
        if (isNaN(id)) { console.error('Usage: crystal forget <id>'); process.exit(1); }
        const ok = crystal.forget(id);
        console.log(ok ? `Forgot memory ${id}` : `Memory ${id} not found or already deprecated`);
        break;
      }

      case 'status': {
        const status = await crystal.status();
        console.log(`Memory Crystal Status`);
        console.log(`  Data dir:   ${status.dataDir}`);
        console.log(`  Provider:   ${status.embeddingProvider}`);
        console.log(`  Chunks:     ${status.chunks.toLocaleString()}`);
        console.log(`  Memories:   ${status.memories}`);
        console.log(`  Sources:    ${status.sources}`);
        console.log(`  Agents:     ${status.agents.length > 0 ? status.agents.join(', ') : 'none yet'}`);
        break;
      }

      case 'sources': {
        const subCommand = positional[0];
        if (!subCommand) {
          console.error('Usage: crystal sources <add|sync|status|remove> ...');
          process.exit(1);
        }

        switch (subCommand) {
          case 'add': {
            const path = positional[1];
            const name = flags.name;
            if (!path || !name) {
              console.error('Usage: crystal sources add <path> --name <name>');
              process.exit(1);
            }
            const col = await crystal.sourcesAdd(path, name);
            console.log(`Added collection "${col.name}" at ${col.root_path}`);
            console.log(`Run "crystal sources sync ${name}" to index files.`);
            break;
          }

          case 'sync': {
            const name = positional[1];
            if (!name) {
              console.error('Usage: crystal sources sync <name> [--dry-run]');
              process.exit(1);
            }
            const dryRun = 'dry-run' in flags;
            if (dryRun) {
              console.log(`Dry run for "${name}"...`);
            } else {
              console.log(`Syncing "${name}"...`);
            }
            const result = await crystal.sourcesSync(name, { dryRun });
            console.log(`  Added:   ${result.added} files`);
            console.log(`  Updated: ${result.updated} files`);
            console.log(`  Removed: ${result.removed} files`);
            console.log(`  Chunks:  ${result.chunks_added} embedded`);
            console.log(`  Time:    ${(result.duration_ms / 1000).toFixed(1)}s`);
            break;
          }

          case 'status': {
            const status = crystal.sourcesStatus();
            if (status.collections.length === 0) {
              console.log('No source collections. Use "crystal sources add <path> --name <name>" to add one.');
            } else {
              console.log('Source Collections:');
              for (const col of status.collections) {
                const syncAgo = col.last_sync_at
                  ? `${Math.round((Date.now() - new Date(col.last_sync_at).getTime()) / 60000)}m ago`
                  : 'never';
                console.log(`  ${col.name}: ${col.file_count.toLocaleString()} files, ${col.chunk_count.toLocaleString()} chunks, last sync ${syncAgo}`);
              }
              console.log(`  Total: ${status.total_files.toLocaleString()} files, ${status.total_chunks.toLocaleString()} chunks`);
            }
            break;
          }

          case 'remove': {
            const name = positional[1];
            if (!name) {
              console.error('Usage: crystal sources remove <name>');
              process.exit(1);
            }
            const ok = crystal.sourcesRemove(name);
            console.log(ok ? `Removed collection "${name}"` : `Collection "${name}" not found`);
            break;
          }

          default:
            console.error(`Unknown sources subcommand: ${subCommand}`);
            process.exit(1);
        }
        break;
      }

      case 'init': {
        const agentId = flags.agent || getAgentId();
        const paths = scaffoldLdm(agentId);
        console.log(`LDM scaffolded for agent "${agentId}"`);
        console.log(`  Root:         ${paths.root}`);
        console.log(`  Crystal DB:   ${paths.crystalDb}`);
        console.log(`  Transcripts:  ${paths.transcripts}`);
        console.log(`  Sessions:     ${paths.sessions}`);
        console.log(`  Daily:        ${paths.daily}`);
        console.log(`  Journals:     ${paths.journals}`);
        break;
      }

      case 'migrate-db': {
        const paths = ensureLdm();
        const HOME = process.env.HOME || '';
        const legacyDir = join(HOME, '.openclaw', 'memory-crystal');
        const legacyDb = join(legacyDir, 'crystal.db');
        const destDb = paths.crystalDb;

        if (!existsSync(legacyDb)) {
          console.error(`Source not found: ${legacyDb}`);
          process.exit(1);
        }

        if (existsSync(destDb)) {
          try {
            const stat = lstatSync(destDb);
            if (!stat.isSymbolicLink()) {
              console.error(`Destination already exists (not a symlink): ${destDb}`);
              console.error('If this is from a previous migration, remove it first.');
              process.exit(1);
            }
          } catch {}
        }

        // Copy crystal.db (never move)
        console.log(`Copying ${legacyDb} -> ${destDb}`);
        copyFileSync(legacyDb, destDb);

        // Verify copy by opening with better-sqlite3
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(destDb, { readonly: true });
        const row = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as any;
        db.close();
        console.log(`Verified: ${row.count.toLocaleString()} chunks in destination DB`);

        // Create symlink: legacy path -> new path
        if (existsSync(legacyDb)) {
          try {
            const stat = lstatSync(legacyDb);
            if (!stat.isSymbolicLink()) {
              unlinkSync(legacyDb);
              symlinkSync(destDb, legacyDb);
              console.log(`Symlinked ${legacyDb} -> ${destDb}`);
            }
          } catch (err: any) {
            console.error(`Symlink failed (non-fatal): ${err.message}`);
          }
        }

        // Handle lance/ directory if it exists
        const legacyLance = join(legacyDir, 'lance');
        if (existsSync(legacyLance)) {
          try {
            const stat = lstatSync(legacyLance);
            if (!stat.isSymbolicLink()) {
              // Copy lance dir handled by LanceDB on next write
              console.log(`Note: lance/ at ${legacyLance} left in place (LanceDB will use new path on next write)`);
            }
          } catch {}
        }

        console.log('Migration complete. Restart gateway to use new path.');
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log(USAGE);
        process.exit(1);
    }
  } finally {
    crystal.close();
  }
}

async function handleLdmCommand(command: string, flags: Record<string, string>): Promise<void> {
  if (command === 'init') {
    const agentId = flags.agent || getAgentId();
    const paths = scaffoldLdm(agentId);
    console.log(`LDM scaffolded for agent "${agentId}"`);
    console.log(`  Root:         ${paths.root}`);
    console.log(`  Crystal DB:   ${paths.crystalDb}`);
    console.log(`  Transcripts:  ${paths.transcripts}`);
    console.log(`  Sessions:     ${paths.sessions}`);
    console.log(`  Daily:        ${paths.daily}`);
    console.log(`  Journals:     ${paths.journals}`);
    return;
  }

  if (command === 'migrate-db') {
    const paths = ensureLdm();
    const HOME = process.env.HOME || '';
    const legacyDir = join(HOME, '.openclaw', 'memory-crystal');
    const legacyDb = join(legacyDir, 'crystal.db');
    const destDb = paths.crystalDb;

    if (!existsSync(legacyDb)) {
      console.error(`Source not found: ${legacyDb}`);
      process.exit(1);
    }

    if (existsSync(destDb)) {
      try {
        const stat = lstatSync(destDb);
        if (!stat.isSymbolicLink()) {
          console.error(`Destination already exists (not a symlink): ${destDb}`);
          console.error('If this is from a previous migration, remove it first.');
          process.exit(1);
        }
      } catch {}
    }

    console.log(`Copying ${legacyDb} -> ${destDb}`);
    copyFileSync(legacyDb, destDb);

    // Verify copy
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(destDb, { readonly: true });
    const row = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as any;
    db.close();
    console.log(`Verified: ${row.count.toLocaleString()} chunks in destination DB`);

    // Symlink legacy path to new location
    try {
      const stat = lstatSync(legacyDb);
      if (!stat.isSymbolicLink()) {
        unlinkSync(legacyDb);
        symlinkSync(destDb, legacyDb);
        console.log(`Symlinked ${legacyDb} -> ${destDb}`);
      }
    } catch (err: any) {
      console.error(`Symlink failed (non-fatal): ${err.message}`);
    }

    console.log('Migration complete. Restart gateway to use new path.');
    return;
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
