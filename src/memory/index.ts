/**
 * Public API for the selector memory system.
 *
 * Two main operations:
 *   - loadMemoryForTest()  — called before a test to inject known-good selectors
 *   - saveMemoryAfterTest() — called after a test to extract and persist new learnings
 *
 * Memory flows through the system as:
 *   Load (suite + test files) → Merge → Inject into AI prompt → Test runs →
 *   Extract learnings → Merge with existing → Prune → Save (suite + test files)
 */

import type { LanguageModel } from 'ai';
import { logger } from '../utils/logger.js';
import type { StepDetail } from '../reporter/types.js';
import type { MemoryConfig, SelectorEntry } from './types.js';
import {
  getTestMemoryPath,
  getSuiteMemoryPath,
  loadMemoryFile,
  saveMemoryFile,
  mergeMemory,
  pruneMemory,
} from './store.js';
import { extractSelectorMemory } from './extractor.js';

const MAX_LOADED_ENTRIES = 50;

/**
 * Load remembered selectors for a test.
 * Combines suite-level and test-specific memory, preferring test-specific on conflict.
 */
export function loadMemoryForTest(
  config: MemoryConfig,
  suiteName: string,
  testName: string
): SelectorEntry[] {
  const suitePath = getSuiteMemoryPath(config.dir, suiteName);
  const testPath = getTestMemoryPath(config.dir, suiteName, testName);

  const suiteMemory = loadMemoryFile(suitePath);
  const testMemory = loadMemoryFile(testPath);

  // Merge: test-specific entries take precedence (loaded second)
  const combined = mergeMemory(suiteMemory.selectors, testMemory.selectors);

  // Sort by confidence and cap
  return combined
    .sort((a, b) => b.confidence - a.confidence || b.useCount - a.useCount)
    .slice(0, MAX_LOADED_ENTRIES);
}

/**
 * Extract and save selector memory after a test run.
 * Saves to both the test-specific file and the suite aggregate.
 */
export async function saveMemoryAfterTest(
  config: MemoryConfig,
  model: LanguageModel,
  suiteName: string,
  testName: string,
  stepDetails: StepDetail[],
  testPassed: boolean
): Promise<void> {
  const newEntries = await extractSelectorMemory(model, testName, stepDetails, testPassed);

  if (newEntries.length === 0) {
    logger.debug(`No selectors to remember from test: "${testName}"`);
    return;
  }

  // Save test-specific memory
  const testPath = getTestMemoryPath(config.dir, suiteName, testName);
  const existingTest = loadMemoryFile(testPath);
  const mergedTest = mergeMemory(existingTest.selectors, newEntries);
  const prunedTest = pruneMemory(mergedTest);
  saveMemoryFile(testPath, { ...existingTest, selectors: prunedTest });

  // Save suite-level memory
  const suitePath = getSuiteMemoryPath(config.dir, suiteName);
  const existingSuite = loadMemoryFile(suitePath);
  const mergedSuite = mergeMemory(existingSuite.selectors, newEntries);
  const prunedSuite = pruneMemory(mergedSuite);
  saveMemoryFile(suitePath, { ...existingSuite, selectors: prunedSuite });

  logger.debug(
    `Remembered ${newEntries.length} selector(s) from test: "${testName}" (test: ${prunedTest.length}, suite: ${prunedSuite.length} total)`
  );
}
