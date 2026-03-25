import { describe, it, expect } from 'vitest'
import { buildMemoryPromptSection } from '../../../src/memory/injector.js'
import type { SelectorEntry } from '../../../src/memory/types.js'

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

describe('buildMemoryPromptSection', () => {
  it('returns empty string for empty entries', () => {
    expect(buildMemoryPromptSection([])).toBe('')
  })

  it('returns empty string for undefined-like input', () => {
    expect(buildMemoryPromptSection(null as any)).toBe('')
  })

  it('produces a markdown table for entries', () => {
    const entries = [makeEntry()]
    const result = buildMemoryPromptSection(entries)

    expect(result).toContain('## Remembered Selectors')
    expect(result).toContain('| Element | Selector | Strategy | Page | Confidence |')
    expect(result).toContain('| login button | Sign In | text | /login | 50% |')
  })

  it('includes the disclaimer text', () => {
    const result = buildMemoryPromptSection([makeEntry()])
    expect(result).toContain('fall back to your normal approach')
  })

  it('sorts by confidence descending', () => {
    const entries = [
      makeEntry({ elementDescription: 'low', confidence: 0.3 }),
      makeEntry({ elementDescription: 'high', confidence: 0.9 }),
      makeEntry({ elementDescription: 'mid', confidence: 0.6 }),
    ]

    const result = buildMemoryPromptSection(entries)
    const lines = result.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Element') && !l.startsWith('|--'))

    expect(lines[0]).toContain('high')
    expect(lines[1]).toContain('mid')
    expect(lines[2]).toContain('low')
  })

  it('caps at 50 entries', () => {
    const entries = Array.from({ length: 60 }, (_, i) => makeEntry({ elementDescription: `element-${i}`, confidence: i / 100 }))

    const result = buildMemoryPromptSection(entries)
    const dataRows = result.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Element') && !l.startsWith('|--'))

    expect(dataRows).toHaveLength(50)
  })

  it('shows confidence as percentage', () => {
    const entries = [makeEntry({ confidence: 0.95 })]
    const result = buildMemoryPromptSection(entries)
    expect(result).toContain('95%')
  })
})
