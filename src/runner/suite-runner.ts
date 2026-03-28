import type { LanguageModel } from 'ai';
import type { SynthConfig } from '../config/schema.js';
import type { TestSuite } from '../parser/types.js';
import type { Reporter, RunResult, SuiteResult } from '../reporter/types.js';
import { BrowserManager } from '../browser/manager.js';
import { runTest } from './test-runner.js';
import { logger } from '../utils/logger.js';

export interface SuiteRunnerOptions {
  suites: TestSuite[];
  model: LanguageModel;
  config: SynthConfig;
  appContext: string;
  reporter: Reporter;
  grep?: string;
}

export async function runSuites(options: SuiteRunnerOptions): Promise<RunResult> {
  const { suites, model, config, appContext, reporter, grep } = options;
  const runStart = Date.now();

  const browserManager = new BrowserManager(config);
  await browserManager.launch();

  const allSuiteResults: SuiteResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  try {
    for (const suite of suites) {
      const tests = grep
        ? suite.tests.filter((t) =>
            t.name.toLowerCase().includes(grep.toLowerCase())
          )
        : suite.tests;

      if (tests.length === 0) continue;

      reporter.onSuiteStart(suite.name, suite.sourceFile);
      const suiteStart = Date.now();
      const suiteResult: SuiteResult = {
        suiteName: suite.name,
        sourceFile: suite.sourceFile,
        tests: [],
        durationMs: 0,
      };

      const groups = suite.groups && suite.groups.length > 0
        ? suite.groups
        : tests.map((testCase, index) => ({
          id: `window-${index + 1}`,
          tests: [testCase],
          reason: 'fallback-isolation',
        }));

      for (const group of groups) {
        // Reuse a page for tests that share the same window
        const page = await browserManager.newPage();

        try {
          for (let index = 0; index < group.tests.length; index++) {
            const testCase = group.tests[index];
            reporter.onTestStart(testCase.name);

            try {
              const result = await runTest(
                testCase,
                page,
                model,
                config,
                appContext,
                { startFromBaseUrl: index === 0, reporter }
              );
              suiteResult.tests.push(result);
              reporter.onTestFinish(result);

              if (result.pass) {
                totalPassed++;
              } else {
                totalFailed++;
              }
            } catch (err) {
              const errorResult = {
                testName: testCase.name,
                suiteName: testCase.suite,
                pass: false,
                reason: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
                steps: 0,
                durationMs: Date.now() - suiteStart,
                stepDetails: [],
              };
              suiteResult.tests.push(errorResult);
              reporter.onTestFinish(errorResult);
              totalFailed++;
            }
          }
        } finally {
          await page.context().close();
        }
      }

      suiteResult.durationMs = Date.now() - suiteStart;
      allSuiteResults.push(suiteResult);
      reporter.onSuiteFinish(suiteResult);
    }
  } finally {
    await browserManager.close();
  }

  const runResult: RunResult = {
    suites: allSuiteResults,
    totalPassed,
    totalFailed,
    totalTests: totalPassed + totalFailed,
    durationMs: Date.now() - runStart,
  };

  reporter.onRunFinish(runResult);
  return runResult;
}
