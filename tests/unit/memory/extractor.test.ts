import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StepDetail } from '../../../src/reporter/types.js'

// Mock the ai module before importing extractor
vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

import { generateText } from 'ai'
import { extractSelectorMemory } from '../../../src/memory/extractor.js'

const mockModel = {} as any

function makeStep(overrides: Partial<StepDetail> = {}): StepDetail {
  return {
    stepNumber: 1,
    action: 'click',
    actionArgs: { selector: 'Sign In' },
    actionResult: 'Clicked element "Sign In" at /login',
    actionSuccess: true,
    ...overrides,
  }
}

describe('extractSelectorMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns entries from successful extraction', async () => {
    const mockResponse = [
      {
        elementDescription: 'login button',
        selector: 'Sign In',
        strategy: 'text',
        action: 'click',
        pageUrl: '/login',
      },
    ]

    vi.mocked(generateText).mockResolvedValueOnce({
      text: JSON.stringify(mockResponse),
    } as any)

    const result = await extractSelectorMemory(mockModel, 'User can log in', [makeStep()], true)

    expect(result).toHaveLength(1)
    expect(result[0].elementDescription).toBe('login button')
    expect(result[0].selector).toBe('Sign In')
    expect(result[0].confidence).toBe(0.5)
    expect(result[0].useCount).toBe(1)
  })

  it('sets confidence 0.3 for failed tests', async () => {
    const mockResponse = [
      {
        elementDescription: 'login button',
        selector: 'Sign In',
        strategy: 'text',
        action: 'click',
        pageUrl: '/login',
      },
    ]

    vi.mocked(generateText).mockResolvedValueOnce({
      text: JSON.stringify(mockResponse),
    } as any)

    const result = await extractSelectorMemory(mockModel, 'User can log in', [makeStep()], false)

    expect(result[0].confidence).toBe(0.3)
  })

  it('returns empty array for empty step log', async () => {
    const result = await extractSelectorMemory(mockModel, 'Empty test', [], true)
    expect(result).toEqual([])
    expect(generateText).not.toHaveBeenCalled()
  })

  it('returns empty array when no element-targeting actions', async () => {
    const result = await extractSelectorMemory(
      mockModel,
      'Navigate test',
      [makeStep({ action: 'navigate', actionArgs: { url: '/login' } })],
      true,
    )
    expect(result).toEqual([])
  })

  it('filters out failed actions', async () => {
    const steps = [makeStep({ actionSuccess: false }), makeStep({ action: 'type', actionArgs: { selector: 'Email' }, actionSuccess: true })]

    const mockResponse = [
      {
        elementDescription: 'email input',
        selector: 'Email',
        strategy: 'label',
        action: 'type',
        pageUrl: '/login',
      },
    ]

    vi.mocked(generateText).mockResolvedValueOnce({
      text: JSON.stringify(mockResponse),
    } as any)

    const result = await extractSelectorMemory(mockModel, 'Login test', steps, true)

    // The generateText was called (because there's 1 successful element action)
    expect(generateText).toHaveBeenCalled()
    expect(result).toHaveLength(1)
  })

  it('returns empty array on LLM error', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error('API error'))

    const result = await extractSelectorMemory(mockModel, 'Error test', [makeStep()], true)
    expect(result).toEqual([])
  })

  it('returns empty array on unparseable JSON', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: 'not valid json {{{',
    } as any)

    const result = await extractSelectorMemory(mockModel, 'Parse error test', [makeStep()], true)
    expect(result).toEqual([])
  })

  it('returns empty array when AI returns non-array', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: '{"not": "an array"}',
    } as any)

    const result = await extractSelectorMemory(mockModel, 'Non-array test', [makeStep()], true)
    expect(result).toEqual([])
  })

  it('filters out entries with missing fields', async () => {
    const mockResponse = [
      {
        elementDescription: 'login button',
        selector: 'Sign In',
        strategy: 'text',
        action: 'click',
        pageUrl: '/login',
      },
      {
        elementDescription: 'incomplete',
        // missing selector, strategy, etc.
      },
    ]

    vi.mocked(generateText).mockResolvedValueOnce({
      text: JSON.stringify(mockResponse),
    } as any)

    const result = await extractSelectorMemory(mockModel, 'Filter test', [makeStep()], true)
    expect(result).toHaveLength(1)
  })
})
