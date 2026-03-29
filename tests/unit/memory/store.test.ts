import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  sanitizeName,
  getTestMemoryPath,
  getSuiteMemoryPath,
  loadMemoryFile,
  saveMemoryFile,
  mergeMemory,
  pruneMemory,
} from '../../../src/memory/store.js';
import type { SelectorEntry, SelectorMemoryFile } from '../../../src/memory/types.js';

function makeEntry(overrides: Partial<SelectorEntry> = {}): SelectorEntry {
  return {
    elementDescription: 'login button',
    selector: 'Sign In',
    strategy: 'text',
    action: 'click',
    pageUrl: '/login',
    confidence: 0.5,
    lastUsed: new Date().toISOString(),
    useCount: 1,
    ...overrides,
  };
}

describe('sanitizeName', () => {
  it('lowercases and replaces non-alphanumeric', () => {
    expect(sanitizeName('Login Tests')).toBe('login-tests');
  });

  it('trims leading and trailing dashes', () => {
    expect(sanitizeName('--hello--')).toBe('hello');
  });

  it('handles special characters', () => {
    expect(sanitizeName('User can log in!')).toBe('user-can-log-in');
  });

  it('handles empty string', () => {
    expect(sanitizeName('')).toBe('');
  });
});

describe('path helpers', () => {
  it('getTestMemoryPath builds correct path', () => {
    const result = getTestMemoryPath('/memory', 'Auth Tests', 'User can log in');
    expect(result).toBe(path.join('/memory', 'auth-tests', 'user-can-log-in.json'));
  });

  it('getSuiteMemoryPath builds correct path', () => {
    const result = getSuiteMemoryPath('/memory', 'Auth Tests');
    expect(result).toBe(path.join('/memory', 'auth-tests', '_suite.json'));
  });
});

describe('loadMemoryFile', () => {
  it('returns empty memory for missing file', () => {
    const result = loadMemoryFile('/nonexistent/path.json');
    expect(result.version).toBe(1);
    expect(result.selectors).toEqual([]);
  });

  it('loads valid memory file', () => {
    const tmpFile = path.join(os.tmpdir(), `synth-test-${Date.now()}.json`);
    const data: SelectorMemoryFile = {
      version: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
      selectors: [makeEntry()],
    };
    fs.writeFileSync(tmpFile, JSON.stringify(data), 'utf-8');

    const result = loadMemoryFile(tmpFile);
    expect(result.version).toBe(1);
    expect(result.selectors).toHaveLength(1);
    expect(result.selectors[0].selector).toBe('Sign In');

    fs.unlinkSync(tmpFile);
  });

  it('returns empty memory for corrupted JSON', () => {
    const tmpFile = path.join(os.tmpdir(), `synth-test-corrupt-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, '{invalid json!!!', 'utf-8');

    const result = loadMemoryFile(tmpFile);
    expect(result.version).toBe(1);
    expect(result.selectors).toEqual([]);

    fs.unlinkSync(tmpFile);
  });

  it('returns empty memory for wrong version', () => {
    const tmpFile = path.join(os.tmpdir(), `synth-test-version-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify({ version: 99, selectors: [] }), 'utf-8');

    const result = loadMemoryFile(tmpFile);
    expect(result.selectors).toEqual([]);

    fs.unlinkSync(tmpFile);
  });
});

describe('saveMemoryFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `synth-save-test-${Date.now()}`);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates directories and writes valid JSON', () => {
    const filePath = path.join(tmpDir, 'suite', 'test.json');
    const data: SelectorMemoryFile = {
      version: 1,
      updatedAt: '',
      selectors: [makeEntry()],
    };

    saveMemoryFile(filePath, data);

    expect(fs.existsSync(filePath)).toBe(true);
    const loaded = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(loaded.version).toBe(1);
    expect(loaded.selectors).toHaveLength(1);
    expect(loaded.updatedAt).toBeTruthy();
  });

  it('overwrites existing file', () => {
    const filePath = path.join(tmpDir, 'test.json');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(filePath, '{"old": true}', 'utf-8');

    saveMemoryFile(filePath, {
      version: 1,
      updatedAt: '',
      selectors: [makeEntry()],
    });

    const loaded = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(loaded.version).toBe(1);
    expect(loaded.selectors).toHaveLength(1);
  });
});

describe('mergeMemory', () => {
  it('adds new entries', () => {
    const result = mergeMemory([], [makeEntry()]);
    expect(result).toHaveLength(1);
  });

  it('bumps confidence for matching entries with same selector', () => {
    const existing = [makeEntry({ confidence: 0.5, useCount: 1 })];
    const incoming = [makeEntry({ confidence: 0.5, useCount: 1 })];

    const result = mergeMemory(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.6);
    expect(result[0].useCount).toBe(2);
  });

  it('caps confidence at 1.0', () => {
    const existing = [makeEntry({ confidence: 0.95, useCount: 10 })];
    const incoming = [makeEntry({ confidence: 0.5, useCount: 1 })];

    const result = mergeMemory(existing, incoming);
    expect(result[0].confidence).toBe(1.0);
  });

  it('replaces selector when incoming has higher confidence', () => {
    const existing = [makeEntry({ selector: 'old-selector', confidence: 0.3 })];
    const incoming = [makeEntry({ selector: 'new-selector', confidence: 0.5 })];

    const result = mergeMemory(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].selector).toBe('new-selector');
  });

  it('keeps existing selector when it has higher confidence', () => {
    const existing = [makeEntry({ selector: 'good-selector', confidence: 0.9 })];
    const incoming = [makeEntry({ selector: 'new-selector', confidence: 0.3 })];

    const result = mergeMemory(existing, incoming);
    expect(result[0].selector).toBe('good-selector');
  });

  it('deduplicates by identity tuple', () => {
    const existing = [
      makeEntry({ elementDescription: 'button A', pageUrl: '/a', action: 'click' }),
      makeEntry({ elementDescription: 'button B', pageUrl: '/b', action: 'click' }),
    ];
    const incoming = [
      makeEntry({ elementDescription: 'button A', pageUrl: '/a', action: 'click' }),
      makeEntry({ elementDescription: 'button C', pageUrl: '/c', action: 'click' }),
    ];

    const result = mergeMemory(existing, incoming);
    expect(result).toHaveLength(3);
  });
});

describe('pruneMemory', () => {
  it('removes entries below minimum confidence', () => {
    const entries = [
      makeEntry({ confidence: 0.5 }),
      makeEntry({ elementDescription: 'weak', confidence: 0.05 }),
    ];

    const result = pruneMemory(entries, { minConfidence: 0.1 });
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.5);
  });

  it('removes entries older than maxAgeDays', () => {
    const old = new Date();
    old.setDate(old.getDate() - 100);

    const entries = [
      makeEntry({ lastUsed: new Date().toISOString() }),
      makeEntry({ elementDescription: 'old', lastUsed: old.toISOString() }),
    ];

    const result = pruneMemory(entries, { maxAgeDays: 90 });
    expect(result).toHaveLength(1);
  });

  it('caps at maxEntries sorted by confidence', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry({
        elementDescription: `entry-${i}`,
        confidence: i * 0.1,
      })
    );

    const result = pruneMemory(entries, { maxEntries: 3 });
    expect(result).toHaveLength(3);
    expect(result[0].confidence).toBeCloseTo(0.9);
    expect(result[1].confidence).toBeCloseTo(0.8);
    expect(result[2].confidence).toBeCloseTo(0.7);
  });

  it('uses default options when none provided', () => {
    const entries = [makeEntry({ confidence: 0.5 })];
    const result = pruneMemory(entries);
    expect(result).toHaveLength(1);
  });
});
