import { ParseError } from '../utils/errors.js';
import type { TestCase, TestSuite } from './types.js';

export function parseMarkdownTests(
  content: string,
  sourceFile: string
): TestSuite[] {
  const lines = content.split('\n');
  const suites: TestSuite[] = [];
  let currentSuiteName = 'Default';
  let currentTests: TestCase[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Heading = suite name
    const headingMatch = trimmed.match(/^#+\s+(.+)$/);
    if (headingMatch) {
      // Save previous suite if it has tests
      if (currentTests.length > 0) {
        suites.push({
          name: currentSuiteName,
          tests: currentTests,
          sourceFile,
        });
      }
      currentSuiteName = headingMatch[1].trim();
      currentTests = [];
      continue;
    }

    // Bullet point = test case
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const testName = bulletMatch[1].trim();
      if (testName) {
        currentTests.push({
          name: testName,
          suite: currentSuiteName,
        });
      }
      continue;
    }
  }

  // Save last suite
  if (currentTests.length > 0) {
    suites.push({
      name: currentSuiteName,
      tests: currentTests,
      sourceFile,
    });
  }

  if (suites.length === 0) {
    throw new ParseError(
      `No tests found in ${sourceFile}. Tests should be bullet points (- or *) under markdown headings (#).`
    );
  }

  return suites;
}
