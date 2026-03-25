import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsoleReporter } from '../../../src/reporter/console-reporter.js'
import type { RunResult, TestResult } from '../../../src/reporter/types.js'

describe('ConsoleReporter', () => {
  let reporter: ConsoleReporter
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    reporter = new ConsoleReporter()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints suite name on suite start', () => {
    reporter.onSuiteStart('Auth Tests', 'tests/auth.test.md')
    expect(consoleSpy).toHaveBeenCalled()
    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('Auth Tests')
  })

  it('prints PASS for passing tests', () => {
    const result: TestResult = {
      testName: 'User can log in',
      suiteName: 'Auth',
      pass: true,
      reason: 'Login successful',
      steps: 5,
      durationMs: 3000,
    }
    reporter.onTestFinish(result)
    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('PASS')
    expect(output).toContain('User can log in')
  })

  it('prints FAIL and reason for failing tests', () => {
    const result: TestResult = {
      testName: 'User can sign up',
      suiteName: 'Auth',
      pass: false,
      reason: 'Sign up button not found',
      steps: 3,
      durationMs: 5000,
    }
    reporter.onTestFinish(result)
    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('FAIL')
    expect(output).toContain('Sign up button not found')
  })

  it('prints summary on run finish', () => {
    const result: RunResult = {
      suites: [],
      totalPassed: 3,
      totalFailed: 1,
      totalTests: 4,
      durationMs: 15000,
    }
    reporter.onRunFinish(result)
    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('3 passed')
    expect(output).toContain('1 failed')
    expect(output).toContain('4 total')
  })

  it('formats duration in seconds', () => {
    const result: TestResult = {
      testName: 'test',
      suiteName: 'suite',
      pass: true,
      reason: '',
      steps: 1,
      durationMs: 12300,
    }
    reporter.onTestFinish(result)
    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('12.3s')
  })

  it('formats duration in ms for fast tests', () => {
    const result: TestResult = {
      testName: 'test',
      suiteName: 'suite',
      pass: true,
      reason: '',
      steps: 1,
      durationMs: 500,
    }
    reporter.onTestFinish(result)
    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('500ms')
  })
})
