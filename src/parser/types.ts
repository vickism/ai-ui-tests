export interface TestCase {
  name: string;
  suite: string;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  sourceFile: string;
}
