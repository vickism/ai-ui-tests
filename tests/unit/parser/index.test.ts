import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { discoverTestFiles, parseTestFiles } from '../../../src/parser/index.js';

describe('discoverTestFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synth-discover-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds .test.md files in a directory', () => {
    fs.writeFileSync(path.join(tmpDir, 'auth.test.md'), '# Auth\n- Test');
    fs.writeFileSync(path.join(tmpDir, 'other.md'), '# Not a test');
    const files = discoverTestFiles(tmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('auth.test.md');
  });

  it('finds .tests.md files', () => {
    fs.writeFileSync(path.join(tmpDir, 'suite.tests.md'), '# Suite\n- Test');
    const files = discoverTestFiles(tmpDir);
    expect(files).toHaveLength(1);
  });

  it('finds .synth.md files', () => {
    fs.writeFileSync(path.join(tmpDir, 'flow.synth.md'), '# Flow\n- Test');
    const files = discoverTestFiles(tmpDir);
    expect(files).toHaveLength(1);
  });

  it('finds files recursively in subdirectories', () => {
    const subDir = path.join(tmpDir, 'sub');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'nested.test.md'), '# Nested\n- Test');
    const files = discoverTestFiles(tmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('nested.test.md');
  });

  it('skips node_modules', () => {
    const nm = path.join(tmpDir, 'node_modules');
    fs.mkdirSync(nm);
    fs.writeFileSync(path.join(nm, 'pkg.test.md'), '# Pkg\n- Test');
    const files = discoverTestFiles(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('accepts a single file path', () => {
    const filePath = path.join(tmpDir, 'single.test.md');
    fs.writeFileSync(filePath, '# Single\n- Test');
    const files = discoverTestFiles(filePath);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe(filePath);
  });

  it('throws for non-existent path', () => {
    expect(() => discoverTestFiles('/nonexistent/path')).toThrow('Path not found');
  });

  it('returns sorted files', () => {
    fs.writeFileSync(path.join(tmpDir, 'z.test.md'), '# Z\n- Test');
    fs.writeFileSync(path.join(tmpDir, 'a.test.md'), '# A\n- Test');
    const files = discoverTestFiles(tmpDir);
    expect(files[0]).toContain('a.test.md');
    expect(files[1]).toContain('z.test.md');
  });
});

describe('parseTestFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synth-parse-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses multiple test files into suites', () => {
    const f1 = path.join(tmpDir, 'a.test.md');
    const f2 = path.join(tmpDir, 'b.test.md');
    fs.writeFileSync(f1, '# Suite A\n- Test A1');
    fs.writeFileSync(f2, '# Suite B\n- Test B1\n- Test B2');
    const suites = parseTestFiles([f1, f2]);
    expect(suites).toHaveLength(2);
    expect(suites[0].tests).toHaveLength(1);
    expect(suites[1].tests).toHaveLength(2);
  });
});
