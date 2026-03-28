export interface TestCase {
  name: string;
  suite: string;
}

export interface TestWindowGroup {
  id: string;
  tests: TestCase[];
  reason?: string;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  groups?: TestWindowGroup[];
  sourceFile: string;
}
