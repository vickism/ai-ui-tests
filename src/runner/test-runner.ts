import type { Page } from 'playwright';
import type { LanguageModel } from 'ai';
import type { SynthConfig } from '../config/schema.js';
import type { TestCase } from '../parser/types.js';
import type { Reporter, TestResult } from '../reporter/types.js';
import { runAgentLoop } from '../agent/loop.js';
import { saveFailureScreenshot } from '../reporter/screenshot-reporter.js';

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

  const agentResult = await runAgentLoop({
    testGoal: testCase.name,
    page,
    model,
    config,
    appContext,
    onStepUpdate: options?.reporter
      ? (detail) => options.reporter!.onStepUpdate(detail)
      : undefined,
  });

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
