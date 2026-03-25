/**
 * Types for the test file parser.
 *
 * Tests are defined in .test.md files as:
 *   - Headings (# h1-h6) → TestSuite names
 *   - Bullet points (- or *) → TestCase names (plain English)
 *
 * TestWindowGroups control browser isolation — tests in the same group
 * share a browser page (for session continuity), while different groups
 * get isolated pages.
 */

/** A single test case — one plain English bullet point from a .test.md file. */
export interface TestCase {
  name: string
  suite: string
}

export interface TestWindowGroup {
  id: string
  tests: TestCase[]
  reason?: string
}

export interface TestSuite {
  name: string
  tests: TestCase[]
  groups?: TestWindowGroup[]
  sourceFile: string
}
