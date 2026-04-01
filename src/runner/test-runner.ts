/**
 * Orchestrates a single test case execution.
 *
 * For each test:
 *   1. Loads remembered selectors from the memory system (if enabled)
 *   2. Navigates to the base URL
 *   3. Runs the AI agent loop (observe → act → repeat → done)
 *   4. Captures a failure screenshot (if enabled and test failed)
 *   5. Saves new selector learnings to memory (if enabled)
 *   6. Returns a TestResult with pass/fail, reason, timing, and step details
 */

import type { Page } from 'playwright';
import type { LanguageModel } from 'ai';
import type { SynthConfig } from '../config/schema.js';
import type { TestCase } from '../parser/types.js';
import type { Reporter, TestResult } from '../reporter/types.js';
import { runAgentLoop } from '../agent/loop.js';
import { saveFailureScreenshot } from '../reporter/screenshot-reporter.js';
import { loadMemoryForTest, saveMemoryAfterTest } from '../memory/index.js';
import { logger } from '../utils/logger.js';

export async function runTest(
  testCase: TestCase,
  page: Page,
  model: LanguageModel,
  config: SynthConfig,
  appContext: string,
  options?: { startFromBaseUrl?: boolean; reporter?: Reporter }
): Promise<TestResult> {
  if (options?.startFromBaseUrl !== false) {
    // Navigate to base URL at the start of each test
    await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded' });
  }

  // Load remembered selectors from previous runs
  let selectorMemory: import('../memory/types.js').SelectorEntry[] | undefined;
  if (config.memory.enabled) {
    selectorMemory = loadMemoryForTest(config.memory, testCase.suite, testCase.name);
    if (selectorMemory.length > 0) {
      logger.debug(`Loaded ${selectorMemory.length} remembered selector(s) for "${testCase.name}"`);
    }
  }

  const agentResult = await runAgentLoop({
    testGoal: testCase.name,
    page,
    model,
    config,
    appContext,
    selectorMemory,
    onStepUpdate: options?.reporter
      ? (detail) => options.reporter!.onStepUpdate(detail)
      : undefined,
  });

  // Save selector learnings from this run
  if (config.memory.enabled) {
    try {
      await saveMemoryAfterTest(
        config.memory,
        model,
        testCase.suite,
        testCase.name,
        agentResult.stepDetails,
        agentResult.pass
      );
    } catch (err) {
      logger.warn(
        `Failed to save selector memory: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  let screenshotPath: string | undefined;
  if (!agentResult.pass && config.screenshots.onFailure) {
    screenshotPath = await saveFailureScreenshot(
      page,
      testCase.name,
      config.screenshots.dir
    );
  }

  return {
    testName: testCase.name,
    suiteName: testCase.suite,
    pass: agentResult.pass,
    reason: agentResult.reason,
    steps: agentResult.steps,
    durationMs: agentResult.durationMs,
    screenshotPath,
    stepDetails: agentResult.stepDetails,
  };
}
