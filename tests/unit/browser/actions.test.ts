import { describe, it, expect } from 'vitest'
import { executeAction } from '../../../src/browser/actions.js'

describe('executeAction', () => {
  it('returns failure for unknown actions', async () => {
    const mockPage = {} as any
    const result = await executeAction(mockPage, {
      name: 'nonexistent_action',
      args: {},
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('Unknown action')
  })

  it('returns failure when navigate has no page.goto', async () => {
    const mockPage = {
      goto: () => {
        throw new Error('Network error')
      },
    } as any
    const result = await executeAction(mockPage, {
      name: 'navigate',
      args: { url: 'http://localhost:9999' },
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('Network error')
  })

  it('handles get_url action', async () => {
    const mockPage = {
      url: () => 'http://localhost:3000/dashboard',
    } as any
    const result = await executeAction(mockPage, {
      name: 'get_url',
      args: {},
    })
    expect(result.success).toBe(true)
    expect(result.message).toContain('localhost:3000/dashboard')
  })

  it('handles assert_url with matching pattern', async () => {
    const mockPage = {
      url: () => 'http://localhost:3000/dashboard',
    } as any
    const result = await executeAction(mockPage, {
      name: 'assert_url',
      args: { pattern: 'dashboard' },
    })
    expect(result.success).toBe(true)
  })

  it('handles assert_url with non-matching pattern', async () => {
    const mockPage = {
      url: () => 'http://localhost:3000/home',
    } as any
    const result = await executeAction(mockPage, {
      name: 'assert_url',
      args: { pattern: 'dashboard' },
    })
    expect(result.success).toBe(false)
  })

  it('handles keyboard press', async () => {
    let pressedKey = ''
    const mockPage = {
      keyboard: {
        press: async (key: string) => {
          pressedKey = key
        },
      },
    } as any
    const result = await executeAction(mockPage, {
      name: 'press_key',
      args: { key: 'Enter' },
    })
    expect(result.success).toBe(true)
    expect(pressedKey).toBe('Enter')
  })

  it('handles wait action', async () => {
    const mockPage = {
      waitForTimeout: async (_ms: number) => {},
    } as any
    const result = await executeAction(mockPage, {
      name: 'wait',
      args: { milliseconds: 100 },
    })
    expect(result.success).toBe(true)
  })

  it('caps wait at 5 seconds', async () => {
    let actualMs = 0
    const mockPage = {
      waitForTimeout: async (ms: number) => {
        actualMs = ms
      },
    } as any
    await executeAction(mockPage, {
      name: 'wait',
      args: { milliseconds: 99999 },
    })
    expect(actualMs).toBe(5000)
  })

  it('handles go_back action', async () => {
    let wentBack = false
    const mockPage = {
      goBack: async () => {
        wentBack = true
      },
    } as any
    const result = await executeAction(mockPage, {
      name: 'go_back',
      args: {},
    })
    expect(result.success).toBe(true)
    expect(wentBack).toBe(true)
  })

  it('handles go_forward action', async () => {
    let wentForward = false
    const mockPage = {
      goForward: async () => {
        wentForward = true
      },
    } as any
    const result = await executeAction(mockPage, {
      name: 'go_forward',
      args: {},
    })
    expect(result.success).toBe(true)
    expect(wentForward).toBe(true)
  })

  it('handles wait_for_network_idle', async () => {
    const mockPage = {
      waitForLoadState: async (_state: string) => {},
    } as any
    const result = await executeAction(mockPage, {
      name: 'wait_for_network_idle',
      args: {},
    })
    expect(result.success).toBe(true)
  })

  it('handles scroll action', async () => {
    let wheelDelta = 0
    const mockPage = {
      mouse: {
        wheel: async (_x: number, y: number) => {
          wheelDelta = y
        },
      },
    } as any
    const result = await executeAction(mockPage, {
      name: 'scroll',
      args: { direction: 'down', amount: 2 },
    })
    expect(result.success).toBe(true)
    expect(wheelDelta).toBe(200) // 2 * 100
  })

  it('scrolls up with negative delta', async () => {
    let wheelDelta = 0
    const mockPage = {
      mouse: {
        wheel: async (_x: number, y: number) => {
          wheelDelta = y
        },
      },
    } as any
    await executeAction(mockPage, {
      name: 'scroll',
      args: { direction: 'up', amount: 1 },
    })
    expect(wheelDelta).toBe(-100)
  })
})
