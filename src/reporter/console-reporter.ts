/**
 * Colored terminal reporter for test results.
 *
 * Two output modes:
 *   - Compact (default): PASS/FAIL per test with timing. Failure reasons shown inline.
 *   - Verbose (--verbose): AI reasoning in italic gray, step-by-step actions with
 *     checkmarks/crosses, and the AI's final verdict before the PASS/FAIL line.
 *
 * Uses picocolors for terminal formatting (green=pass, red=fail, gray=metadata).
 */

import pc from 'picocolors';
import type { Reporter, StepDetail, TestResult, SuiteResult, RunResult } from './types.js';

export class ConsoleReporter implements Reporter {
  private verbose: boolean;
  private currentStepNum = 0;

  constructor(options?: { verbose?: boolean }) {
    this.verbose = options?.verbose ?? false;
  }

  onSuiteStart(suiteName: string, sourceFile: string): void {
    console.log();
    console.log(
      `  ${pc.bold(suiteName)} ${pc.gray(`(${sourceFile})`)}`
    );
  }

  onTestStart(testName: string): void {
    this.currentStepNum = 0;
    if (this.verbose) {
      console.log();
      console.log(`    ${pc.cyan(pc.bold(`Test: ${testName}`))}`);
      console.log();
    }
  }

  onStepUpdate(detail: StepDetail): void {
    if (!this.verbose) return;

    // Show AI reasoning (thinking)
    if (detail.reasoning) {
      const lines = detail.reasoning.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`    ${pc.gray(pc.italic(line.trim()))}`);
        }
      }
      console.log();
    }

    // Show action as a bold step
    if (detail.action && detail.action !== 'done') {
      this.currentStepNum++;
      const argsStr = formatArgs(detail.actionArgs);
      const header = `    ${pc.bold(`Step ${this.currentStepNum}: ${detail.action}`)}${argsStr ? ` ${pc.gray(argsStr)}` : ''}`;
      console.log(header);

      // Show result
      if (detail.actionResult) {
        const icon = detail.actionSuccess === false ? pc.red('✗') : pc.green('✓');
        console.log(`      ${icon} ${detail.actionResult}`);
      }
      console.log();
    }

    // Show done verdict inline
    if (detail.action === 'done') {
      const args = detail.actionArgs as { pass?: boolean; reason?: string } | undefined;
      if (args) {
        const icon = args.pass ? pc.green('✓') : pc.red('✗');
        console.log(`    ${icon} ${pc.bold('Verdict:')} ${args.reason ?? ''}`);
        console.log();
      }
    }
  }

  onTestFinish(result: TestResult): void {
    const status = result.pass
      ? pc.green(pc.bold('PASS'))
      : pc.red(pc.bold('FAIL'));

    const duration = pc.gray(`(${formatDuration(result.durationMs)}, ${result.steps} steps)`);

    if (this.verbose) {
      // Separator line before result
      console.log(`    ${status} ${result.testName} ${duration}`);
      console.log();
    } else {
      // Compact mode: just pass/fail
      console.log(`    ${status} ${result.testName} ${duration}`);
      if (!result.pass) {
        console.log(`         ${pc.red(result.reason)}`);
      }
    }
  }

  onSuiteFinish(_result: SuiteResult): void {
    // Suite separator handled by onSuiteStart
  }

  onRunFinish(result: RunResult): void {
    console.log();
    console.log(pc.bold('  Results:'));

    const passed = pc.green(`${result.totalPassed} passed`);
    const failed =
      result.totalFailed > 0
        ? pc.red(`${result.totalFailed} failed`)
        : pc.gray('0 failed');

    console.log(`    ${passed}, ${failed}, ${result.totalTests} total`);
    console.log(`    ${pc.gray(`Time: ${formatDuration(result.durationMs)}`)}`);
    console.log();
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatArgs(args?: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) return '';
  const parts: string[] = [];
  for (const [key, val] of Object.entries(args)) {
    if (val !== undefined && val !== null) {
      const str = typeof val === 'string' ? `"${val}"` : String(val);
      parts.push(`${key}=${str}`);
    }
  }
  return parts.join(', ');
}
