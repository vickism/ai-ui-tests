export interface TestResult {
  testName: string;
  suiteName: string;
  pass: boolean;
  reason: string;
  steps: number;
  durationMs: number;
  screenshotPath?: string;
}

export interface SuiteResult {
  suiteName: string;
  sourceFile: string;
  tests: TestResult[];
  durationMs: number;
}

export interface RunResult {
  suites: SuiteResult[];
  totalPassed: number;
  totalFailed: number;
  totalTests: number;
  durationMs: number;
}

export interface Reporter {
  onSuiteStart(suiteName: string, sourceFile: string): void;
  onTestStart(testName: string): void;
  onTestFinish(result: TestResult): void;
  onSuiteFinish(result: SuiteResult): void;
  onRunFinish(result: RunResult): void;
}
