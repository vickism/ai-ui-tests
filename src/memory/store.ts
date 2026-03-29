import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';
import type { SelectorEntry, SelectorMemoryFile } from './types.js';

/**
 * Sanitize a name for use as a directory or file name.
 * Lowercase, replace non-alphanumeric runs with dashes, trim dashes.
 */
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getTestMemoryPath(
  memoryDir: string,
  suiteName: string,
  testName: string
): string {
  return path.join(memoryDir, sanitizeName(suiteName), `${sanitizeName(testName)}.json`);
}

export function getSuiteMemoryPath(
  memoryDir: string,
  suiteName: string
): string {
  return path.join(memoryDir, sanitizeName(suiteName), '_suite.json');
}

function emptyMemoryFile(): SelectorMemoryFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    selectors: [],
  };
}

/**
 * Load a memory file from disk. Returns empty memory on missing or corrupt files.
 */
export function loadMemoryFile(filePath: string): SelectorMemoryFile {
  try {
    if (!fs.existsSync(filePath)) {
      return emptyMemoryFile();
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as SelectorMemoryFile;
    if (data.version !== 1 || !Array.isArray(data.selectors)) {
      logger.debug(`Memory file has unexpected format, resetting: ${filePath}`);
      return emptyMemoryFile();
    }
    return data;
  } catch (err) {
    logger.debug(
      `Failed to load memory file ${filePath}: ${err instanceof Error ? err.message : String(err)}`
    );
    return emptyMemoryFile();
  }
}

/**
 * Save a memory file atomically (write to .tmp then rename).
 */
export function saveMemoryFile(filePath: string, memory: SelectorMemoryFile): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const tmpPath = `${filePath}.tmp`;
  memory.updatedAt = new Date().toISOString();
  fs.writeFileSync(tmpPath, JSON.stringify(memory, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Identity key for matching selector entries.
 */
function entryKey(entry: SelectorEntry): string {
  return `${entry.elementDescription}|${entry.pageUrl}|${entry.action}`;
}

/**
 * Merge incoming selector entries with existing ones.
 *
 * - Match on (elementDescription, pageUrl, action) tuple
 * - Same selector: bump confidence +0.1 (capped at 1.0), increment useCount
 * - Different selector with higher confidence: replace
 * - New entry: add
 */
export function mergeMemory(
  existing: SelectorEntry[],
  incoming: SelectorEntry[]
): SelectorEntry[] {
  const map = new Map<string, SelectorEntry>();

  for (const entry of existing) {
    map.set(entryKey(entry), { ...entry });
  }

  for (const entry of incoming) {
    const key = entryKey(entry);
    const prev = map.get(key);

    if (!prev) {
      map.set(key, { ...entry });
    } else if (prev.selector === entry.selector) {
      // Same selector — reinforce
      prev.confidence = Math.min(1.0, prev.confidence + 0.1);
      prev.useCount += entry.useCount;
      prev.lastUsed = entry.lastUsed;
    } else if (entry.confidence >= prev.confidence) {
      // Different selector with equal or higher confidence — replace
      map.set(key, { ...entry });
    }
    // Otherwise keep existing (higher confidence)
  }

  return Array.from(map.values());
}

export interface PruneOptions {
  minConfidence?: number;
  maxAgeDays?: number;
  maxEntries?: number;
}

/**
 * Prune memory entries by confidence, age, and count limits.
 */
export function pruneMemory(
  entries: SelectorEntry[],
  options: PruneOptions = {}
): SelectorEntry[] {
  const {
    minConfidence = 0.1,
    maxAgeDays = 90,
    maxEntries = 100,
  } = options;

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  let result = entries.filter((entry) => {
    if (entry.confidence < minConfidence) return false;
    const age = now - new Date(entry.lastUsed).getTime();
    if (age > maxAgeMs) return false;
    return true;
  });

  // Sort by confidence descending, then by useCount descending
  result.sort((a, b) => b.confidence - a.confidence || b.useCount - a.useCount);

  if (result.length > maxEntries) {
    result = result.slice(0, maxEntries);
  }

  return result;
}
