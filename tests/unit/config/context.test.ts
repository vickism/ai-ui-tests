import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { loadAppContext } from '../../../src/config/context.js'

describe('loadAppContext', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-ui-tests-ctx-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('loads ai-ui-tests.md when present', () => {
    fs.writeFileSync(path.join(tmpDir, 'ai-ui-tests.md'), '# My App\nA test app.')
    const ctx = loadAppContext(tmpDir)
    expect(ctx.content).toContain('My App')
    expect(ctx.content).toContain('A test app')
    expect(ctx.sources).toContain('ai-ui-tests.md')
  })

  it('loads README.md when present', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# README\nProject docs.')
    const ctx = loadAppContext(tmpDir)
    expect(ctx.content).toContain('README')
    expect(ctx.sources).toContain('README.md')
  })

  it('loads both ai-ui-tests.md and README.md', () => {
    fs.writeFileSync(path.join(tmpDir, 'ai-ui-tests.md'), 'AI UI Tests context')
    fs.writeFileSync(path.join(tmpDir, 'README.md'), 'Readme context')
    const ctx = loadAppContext(tmpDir)
    expect(ctx.content).toContain('AI UI Tests context')
    expect(ctx.content).toContain('Readme context')
    expect(ctx.sources).toHaveLength(2)
  })

  it('returns empty content when no context files exist', () => {
    const ctx = loadAppContext(tmpDir)
    expect(ctx.content).toBe('')
    expect(ctx.sources).toHaveLength(0)
  })

  it('skips empty files', () => {
    fs.writeFileSync(path.join(tmpDir, 'ai-ui-tests.md'), '')
    const ctx = loadAppContext(tmpDir)
    expect(ctx.sources).toHaveLength(0)
  })

  it('separates files with section headers', () => {
    fs.writeFileSync(path.join(tmpDir, 'ai-ui-tests.md'), 'content1')
    fs.writeFileSync(path.join(tmpDir, 'README.md'), 'content2')
    const ctx = loadAppContext(tmpDir)
    expect(ctx.content).toContain('--- ai-ui-tests.md ---')
    expect(ctx.content).toContain('--- README.md ---')
  })
})
