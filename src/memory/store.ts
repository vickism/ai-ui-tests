/**
 * Filesystem-backed memory store for selector data.
 *
 * Handles loading, saving, merging, and pruning of selector memory files.
 * All operations are fault-tolerant — corrupted or missing files return
 * empty data rather than throwing errors.
 *
 * Storage layout:
 *   ai-ui-tests-memory/
 *     {suite-name}/
 *       _suite.json       — aggregated selectors across all tests in the suite
 *       {test-name}.json  — selectors specific to one test
 */

import fs from 'node:fs'
import path from 'node:path'
import { logger } from '../utils/logger.js'
import { sanitizeName } from '../utils/sanitize.js'
import type { SelectorEntry, SelectorMemoryFile } from './types.js'

export { sanitizeName }

export function getTestMemoryPath(memoryDir: string, suiteName: string, testName: string): string {
  return path.join(memoryDir, sanitizeName(suiteName), `${sanitizeName(testName)}.json`)
}

export function getSuiteMemoryPath(memoryDir: string, suiteName: string): string {
  return path.join(memoryDir, sanitizeName(suiteName), '_suite.json')
}

function emptyMemoryFile(): SelectorMemoryFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    selectors: [],
  }
}

/**
 * Load a memory file from disk. Returns empty memory on missing or corrupt files.
 */
export function loadMemoryFile(filePath: string): SelectorMemoryFile {
  try {
    if (!fs.existsSync(filePath)) {
      return emptyMemoryFile()
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw) as SelectorMemoryFile
    // Guard against future schema changes or hand-edited files
    if (data.version !== 1 || !Array.isArray(data.selectors)) {
      logger.debug(`Memory file has unexpected format, resetting: ${filePath}`)
      return emptyMemoryFile()
    }
    return data
  } catch (err) {
    logger.debug(`Failed to load memory file ${filePath}: ${err instanceof Error ? err.message : String(err)}`)
    return emptyMemoryFile()
  }
}

/**
 * Save a memory file atomically (write to .tmp then rename).
 */
export function saveMemoryFile(filePath: string, memory: SelectorMemoryFile): void {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })

  // Write-then-rename ensures readers never see a half-written file
  const tmpPath = `${filePath}.tmp`
  memory.updatedAt = new Date().toISOString()
  fs.writeFileSync(tmpPath, JSON.stringify(memory, null, 2), 'utf-8')
  fs.renameSync(tmpPath, filePath)
}

/**
 * Identity key for matching selector entries.
 */
function entryKey(entry: SelectorEntry): string {
  return `${entry.elementDescription}|${entry.pageUrl}|${entry.action}`
}

/**
 * Merge incoming selector entries with existing ones.
 *
 * - Match on (elementDescription, pageUrl, action) tuple
 * - Same selector: bump confidence +0.1 (capped at 1.0), increment useCount
 * - Different selector with higher confidence: replace
 * - New entry: add
 */
export function mergeMemory(existing: SelectorEntry[], incoming: SelectorEntry[]): SelectorEntry[] {
  // Index existing entries by identity key for O(1) lookup during merge
  const map = new Map<string, SelectorEntry>()

  for (const entry of existing) {
    map.set(entryKey(entry), { ...entry })
  }

  for (const entry of incoming) {
    const key = entryKey(entry)
    const prev = map.get(key)

    if (!prev) {
      // Brand-new element/page/action combo — add directly
      map.set(key, { ...entry })
    } else if (prev.selector === entry.selector) {
      // Same selector seen again — reinforce confidence (+0.1, capped at 1.0)
      prev.confidence = Math.min(1.0, prev.confidence + 0.1)
      prev.useCount += entry.useCount
      prev.lastUsed = entry.lastUsed
    } else if (entry.confidence >= prev.confidence) {
      // Selector changed (e.g., DOM restructured) — adopt the newer one if equally or more confident
      map.set(key, { ...entry })
    }
    // Lower-confidence alternative silently dropped — existing selector is more reliable
  }

  return Array.from(map.values())
}

export interface PruneOptions {
  minConfidence?: number
  maxAgeDays?: number
  maxEntries?: number
}

/**
 * Prune memory entries by confidence, age, and count limits.
 */
export function pruneMemory(entries: SelectorEntry[], options: PruneOptions = {}): SelectorEntry[] {
  const { minConfidence = 0.1, maxAgeDays = 90, maxEntries = 100 } = options

  const now = Date.now()
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000

  // First pass: drop entries below confidence floor or past expiry age
  let result = entries.filter((entry) => {
    if (entry.confidence < minConfidence) return false
    const age = now - new Date(entry.lastUsed).getTime()
    if (age > maxAgeMs) return false
    return true
  })

  // Rank remaining entries — highest confidence wins; useCount breaks ties
  result.sort((a, b) => b.confidence - a.confidence || b.useCount - a.useCount)

  // Hard cap prevents unbounded memory growth
  if (result.length > maxEntries) {
    result = result.slice(0, maxEntries)
  }

  return result
}
