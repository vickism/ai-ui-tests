/**
 * Orchestrates running all test suites.
 *
 * Manages the full lifecycle: launch browser → iterate suites → group tests
 * into browser windows → run each test → report results → close browser.
 *
 * Tests within the same window group share a browser page (for session
 * continuity). Tests in different groups get isolated pages. In persistent
 * browser mode, pages are closed but the context is preserved.
 */

import type { LanguageModel } from 'ai'
import { basename } from 'node:path'
import { BrowserManager } from '../browser/manager.js'
import type { AiUiTestsConfig } from '../config/schema.js'
import type { TestSuite } from '../parser/types.js'
import type { Reporter, RunResult, SuiteResult } from '../reporter/types.js'
import { runTest } from './test-runner.js'

export interface SuiteRunnerOptions {
  suites: TestSuite[]
  model: LanguageModel
  config: AiUiTestsConfig
  appContext: string
  reporter: Reporter
  grep?: string
  file?: string
}

export async function runSuites(options: SuiteRunnerOptions): Promise<RunResult> {
  const { suites, model, config, appContext, reporter, grep, file } = options
  const runStart = Date.now()

  const browserManager = new BrowserManager(config)
  await browserManager.launch()

  const allSuiteResults: SuiteResult[] = []
  let totalPassed = 0
  let totalFailed = 0

  try {
    for (const suite of suites) {
      if (file && !basename(suite.sourceFile).toLowerCase().includes(file.toLowerCase())) continue

      const grepLower = grep?.toLowerCase()
      const suiteMatches = grepLower && suite.name.toLowerCase().includes(grepLower)
      const tests = grepLower && !suiteMatches ? suite.tests.filter((t) => t.name.toLowerCase().includes(grepLower)) : suite.tests

      if (tests.length === 0) continue

      reporter.onSuiteStart(suite.name, suite.sourceFile)
      const suiteStart = Date.now()
      const suiteResult: SuiteResult = {
        suiteName: suite.name,
        sourceFile: suite.sourceFile,
        tests: [],
        durationMs: 0,
      }

      const filteredGroups =
        suite.groups && suite.groups.length > 0
          ? suite.groups.map((g) => ({ ...g, tests: g.tests.filter((t) => tests.includes(t)) })).filter((g) => g.tests.length > 0)
          : null

      const groups =
        filteredGroups && filteredGroups.length > 0
          ? filteredGroups
          : tests.map((testCase, index) => ({
              id: `window-${index + 1}`,
              tests: [testCase],
              reason: 'fallback-isolation',
            }))

      for (const group of groups) {
        // Reuse a page for tests that share the same window
        const page = await browserManager.newPage()

        try {
          for (let index = 0; index < group.tests.length; index++) {
            const testCase = group.tests[index]
            reporter.onTestStart(testCase.name)

            try {
              const result = await runTest(testCase, page, model, config, appContext, { startFromBaseUrl: index === 0, reporter })
              suiteResult.tests.push(result)
              reporter.onTestFinish(result)

              if (result.pass) {
                totalPassed++
              } else {
                totalFailed++
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
              }
              suiteResult.tests.push(errorResult)
              reporter.onTestFinish(errorResult)
              totalFailed++
            }
          }
        } finally {
          if (browserManager.isPersistent) {
            // Persistent context — just close the page, not the context
            await page.close()
          } else {
            await page.context().close()
          }
        }
      }

      suiteResult.durationMs = Date.now() - suiteStart
      allSuiteResults.push(suiteResult)
      reporter.onSuiteFinish(suiteResult)
    }
  } finally {
    await browserManager.close()
  }

  const runResult: RunResult = {
    suites: allSuiteResults,
    totalPassed,
    totalFailed,
    totalTests: totalPassed + totalFailed,
    durationMs: Date.now() - runStart,
  }

  reporter.onRunFinish(runResult)
  return runResult
}
