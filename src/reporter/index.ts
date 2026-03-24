import type { Reporter } from './types.js';
import { ConsoleReporter } from './console-reporter.js';

export function createReporter(format: string): Reporter {
  switch (format) {
    case 'console':
    default:
      return new ConsoleReporter();
  }
}

export type { Reporter, TestResult, SuiteResult, RunResult } from './types.js';
