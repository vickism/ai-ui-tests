import { describe, it, expect } from 'vitest';
import { parseMarkdownTests } from '../../../src/parser/markdown-parser.js';

describe('parseMarkdownTests', () => {
  it('parses headings as suites and bullets as tests', () => {
    const md = `
# Authentication

- The user should be able to sign up
- The user should be able to log in

# Dashboard

- The user can see their profile
`;
    const suites = parseMarkdownTests(md, 'test.md');

    expect(suites).toHaveLength(2);
    expect(suites[0].name).toBe('Authentication');
    expect(suites[0].tests).toHaveLength(2);
    expect(suites[0].tests[0].name).toBe('The user should be able to sign up');
    expect(suites[0].tests[1].name).toBe('The user should be able to log in');
    expect(suites[1].name).toBe('Dashboard');
    expect(suites[1].tests).toHaveLength(1);
    expect(suites[1].tests[0].name).toBe('The user can see their profile');
  });

  it('puts tests without a heading into Default suite', () => {
    const md = `
- Test without a heading
- Another test
`;
    const suites = parseMarkdownTests(md, 'test.md');

    expect(suites).toHaveLength(1);
    expect(suites[0].name).toBe('Default');
    expect(suites[0].tests).toHaveLength(2);
  });

  it('supports * bullets', () => {
    const md = `
# Suite
* Test with asterisk
`;
    const suites = parseMarkdownTests(md, 'test.md');

    expect(suites[0].tests[0].name).toBe('Test with asterisk');
  });

  it('ignores non-test lines', () => {
    const md = `
# Suite

Some descriptive text that is not a test.

- Actual test case

Another paragraph.
`;
    const suites = parseMarkdownTests(md, 'test.md');

    expect(suites[0].tests).toHaveLength(1);
    expect(suites[0].tests[0].name).toBe('Actual test case');
  });

  it('throws on empty file', () => {
    expect(() => parseMarkdownTests('', 'empty.md')).toThrow('No tests found');
  });

  it('throws on file with no bullets', () => {
    const md = `
# Just a heading

Some text but no test cases.
`;
    expect(() => parseMarkdownTests(md, 'notest.md')).toThrow('No tests found');
  });

  it('sets sourceFile on each suite', () => {
    const md = `
# Suite
- Test
`;
    const suites = parseMarkdownTests(md, 'my-tests.md');
    expect(suites[0].sourceFile).toBe('my-tests.md');
  });

  it('sets suite name on each test case', () => {
    const md = `
# Auth
- Sign up test
`;
    const suites = parseMarkdownTests(md, 'test.md');
    expect(suites[0].tests[0].suite).toBe('Auth');
  });
});
