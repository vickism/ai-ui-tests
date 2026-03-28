export interface StepDetail {
  stepNumber: number;
  reasoning?: string;
  action?: string;
  actionArgs?: Record<string, unknown>;
  actionResult?: string;
  actionSuccess?: boolean;
}

export interface TestResult {
  testName: string;
  suiteName: string;
  pass: boolean;
  reason: string;
  steps: number;
  durationMs: number;
  screenshotPath?: string;
  stepDetails: StepDetail[];
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
  onStepUpdate(detail: StepDetail): void;
  onTestFinish(result: TestResult): void;
  onSuiteFinish(result: SuiteResult): void;
  onRunFinish(result: RunResult): void;
}
