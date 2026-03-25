import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { SelectorEntry, SelectorMemoryFile } from '../../../src/memory/types.js'

// Mock the ai module (needed by extractor)
vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

import { generateText } from 'ai'
import { loadMemoryForTest, saveMemoryAfterTest } from '../../../src/memory/index.js'

const mockModel = {} as any

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
  }
}

function writeMemoryFile(filePath: string, selectors: SelectorEntry[]): void {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const data: SelectorMemoryFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    selectors,
  }
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8')
}

describe('loadMemoryForTest', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `ai-ui-tests-memory-test-${Date.now()}`)
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns empty array when no memory files exist', () => {
    const result = loadMemoryForTest({ enabled: true, dir: tmpDir }, 'Auth', 'Login test')
    expect(result).toEqual([])
  })

  it('loads suite-level memory', () => {
    const suitePath = path.join(tmpDir, 'auth', '_suite.json')
    writeMemoryFile(suitePath, [makeEntry()])

    const result = loadMemoryForTest({ enabled: true, dir: tmpDir }, 'Auth', 'Login test')
    expect(result).toHaveLength(1)
    expect(result[0].selector).toBe('Sign In')
  })

  it('loads test-specific memory', () => {
    const testPath = path.join(tmpDir, 'auth', 'login-test.json')
    writeMemoryFile(testPath, [makeEntry({ confidence: 0.8 })])

    const result = loadMemoryForTest({ enabled: true, dir: tmpDir }, 'Auth', 'Login test')
    expect(result).toHaveLength(1)
  })

  it('combines suite and test memory, preferring test-specific', () => {
    const suitePath = path.join(tmpDir, 'auth', '_suite.json')
    const testPath = path.join(tmpDir, 'auth', 'login-test.json')

    writeMemoryFile(suitePath, [
      makeEntry({ elementDescription: 'suite-only btn', pageUrl: '/a', confidence: 0.4 }),
      makeEntry({ elementDescription: 'shared btn', pageUrl: '/b', confidence: 0.3 }),
    ])
    writeMemoryFile(testPath, [
      makeEntry({ elementDescription: 'shared btn', pageUrl: '/b', confidence: 0.7 }),
      makeEntry({ elementDescription: 'test-only btn', pageUrl: '/c', confidence: 0.6 }),
    ])

    const result = loadMemoryForTest({ enabled: true, dir: tmpDir }, 'Auth', 'Login test')
    expect(result).toHaveLength(3)
    // Sorted by confidence: shared (merged to 0.8 via +0.1 bump), test-only (0.6), suite-only (0.4)
  })

  it('caps at 50 entries', () => {
    const entries = Array.from({ length: 60 }, (_, i) => makeEntry({ elementDescription: `entry-${i}`, pageUrl: `/${i}`, confidence: 0.5 }))
    const suitePath = path.join(tmpDir, 'auth', '_suite.json')
    writeMemoryFile(suitePath, entries)

    const result = loadMemoryForTest({ enabled: true, dir: tmpDir }, 'Auth', 'Test')
    expect(result).toHaveLength(50)
  })
})

describe('saveMemoryAfterTest', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `ai-ui-tests-memory-save-${Date.now()}`)
    vi.clearAllMocks()
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('saves extracted selectors to test and suite files', async () => {
    const mockResponse = [
      {
        elementDescription: 'submit button',
        selector: 'Submit',
        strategy: 'text',
        action: 'click',
        pageUrl: '/form',
      },
    ]

    vi.mocked(generateText).mockResolvedValueOnce({
      text: JSON.stringify(mockResponse),
    } as any)

    await saveMemoryAfterTest(
      { enabled: true, dir: tmpDir },
      mockModel,
      'Forms',
      'Submit form',
      [
        {
          stepNumber: 1,
          action: 'click',
          actionArgs: { selector: 'Submit' },
          actionResult: 'Clicked Submit',
          actionSuccess: true,
        },
      ],
      true,
    )

    // Check test file was created
    const testPath = path.join(tmpDir, 'forms', 'submit-form.json')
    expect(fs.existsSync(testPath)).toBe(true)
    const testData = JSON.parse(fs.readFileSync(testPath, 'utf-8')) as SelectorMemoryFile
    expect(testData.selectors).toHaveLength(1)
    expect(testData.selectors[0].selector).toBe('Submit')

    // Check suite file was created
    const suitePath = path.join(tmpDir, 'forms', '_suite.json')
    expect(fs.existsSync(suitePath)).toBe(true)
  })

  it('does nothing when extractor returns empty', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: '[]',
    } as any)

    await saveMemoryAfterTest(
      { enabled: true, dir: tmpDir },
      mockModel,
      'Empty',
      'Empty test',
      [
        {
          stepNumber: 1,
          action: 'click',
          actionArgs: { selector: 'X' },
          actionResult: 'ok',
          actionSuccess: true,
        },
      ],
      true,
    )

    // No files should be created
    expect(fs.existsSync(tmpDir)).toBe(false)
  })

  it('merges with existing memory on subsequent saves', async () => {
    // First save
    const mockResponse1 = [
      {
        elementDescription: 'login button',
        selector: 'Sign In',
        strategy: 'text',
        action: 'click',
        pageUrl: '/login',
      },
    ]
    vi.mocked(generateText).mockResolvedValueOnce({
      text: JSON.stringify(mockResponse1),
    } as any)

    const steps = [
      {
        stepNumber: 1,
        action: 'click',
        actionArgs: { selector: 'Sign In' },
        actionResult: 'Clicked',
        actionSuccess: true,
      },
    ]

    await saveMemoryAfterTest({ enabled: true, dir: tmpDir }, mockModel, 'Auth', 'Login', steps, true)

    // Second save — same selector
    vi.mocked(generateText).mockResolvedValueOnce({
      text: JSON.stringify(mockResponse1),
    } as any)

    await saveMemoryAfterTest({ enabled: true, dir: tmpDir }, mockModel, 'Auth', 'Login', steps, true)

    const testPath = path.join(tmpDir, 'auth', 'login.json')
    const data = JSON.parse(fs.readFileSync(testPath, 'utf-8')) as SelectorMemoryFile
    expect(data.selectors).toHaveLength(1)
    // Confidence should have been bumped from merge
    expect(data.selectors[0].confidence).toBeGreaterThan(0.5)
    expect(data.selectors[0].useCount).toBe(2)
  })
})
