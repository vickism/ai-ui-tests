import pc from 'picocolors';
import type { Reporter, TestResult, SuiteResult, RunResult } from './types.js';

export class ConsoleReporter implements Reporter {
  onSuiteStart(suiteName: string, sourceFile: string): void {
    console.log();
    console.log(
      `  ${pc.bold(suiteName)} ${pc.gray(`(${sourceFile})`)}`
    );
  }

  onTestStart(testName: string): void {
    // Could show a spinner here in the future
  }

  onTestFinish(result: TestResult): void {
    const status = result.pass
      ? pc.green(pc.bold('PASS'))
      : pc.red(pc.bold('FAIL'));

    const duration = pc.gray(`(${formatDuration(result.durationMs)}, ${result.steps} steps)`);

    console.log(`    ${status} ${result.testName} ${duration}`);

    if (!result.pass) {
      console.log(`         ${pc.red(result.reason)}`);
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
