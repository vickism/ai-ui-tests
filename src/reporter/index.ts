import type { Reporter } from './types.js';
import { ConsoleReporter } from './console-reporter.js';

export function createReporter(format: string, options?: { verbose?: boolean }): Reporter {
  switch (format) {
    case 'console':
    default:
      return new ConsoleReporter(options);
  }
}

export type { Reporter, TestResult, SuiteResult, RunResult, StepDetail } from './types.js';
