import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadAppContext } from '../../../src/config/context.js';

describe('loadAppContext', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synth-ctx-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads synth.md when present', () => {
    fs.writeFileSync(path.join(tmpDir, 'synth.md'), '# My App\nA test app.');
    const ctx = loadAppContext(tmpDir);
    expect(ctx.content).toContain('My App');
    expect(ctx.content).toContain('A test app');
    expect(ctx.sources).toContain('synth.md');
  });

  it('loads README.md when present', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# README\nProject docs.');
    const ctx = loadAppContext(tmpDir);
    expect(ctx.content).toContain('README');
    expect(ctx.sources).toContain('README.md');
  });

  it('loads both synth.md and README.md', () => {
    fs.writeFileSync(path.join(tmpDir, 'synth.md'), 'Synth context');
    fs.writeFileSync(path.join(tmpDir, 'README.md'), 'Readme context');
    const ctx = loadAppContext(tmpDir);
    expect(ctx.content).toContain('Synth context');
    expect(ctx.content).toContain('Readme context');
    expect(ctx.sources).toHaveLength(2);
  });

  it('returns empty content when no context files exist', () => {
    const ctx = loadAppContext(tmpDir);
    expect(ctx.content).toBe('');
    expect(ctx.sources).toHaveLength(0);
  });

  it('skips empty files', () => {
    fs.writeFileSync(path.join(tmpDir, 'synth.md'), '');
    const ctx = loadAppContext(tmpDir);
    expect(ctx.sources).toHaveLength(0);
  });

  it('separates files with section headers', () => {
    fs.writeFileSync(path.join(tmpDir, 'synth.md'), 'content1');
    fs.writeFileSync(path.join(tmpDir, 'README.md'), 'content2');
    const ctx = loadAppContext(tmpDir);
    expect(ctx.content).toContain('--- synth.md ---');
    expect(ctx.content).toContain('--- README.md ---');
  });
});
