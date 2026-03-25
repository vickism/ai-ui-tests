import { describe, expect, it } from 'vitest'
import { createTools } from '../../../src/ai/tools.js'
import { TestDataSession } from '../../../src/test-data/session.js'

describe('createTools', () => {
  // We can't create a real page, but we can verify the tool structure
  // by creating tools with a mock context
  const mockCtx = {
    page: {} as any,
    screenshotDir: './screenshots',
    testName: 'test',
    stepCount: 0,
    testDataSession: new TestDataSession('test', { seed: 12345 }),
    onPageStateUpdate: () => {},
  }

  it('creates all 26 tools', () => {
    const tools = createTools(mockCtx)
    const toolNames = Object.keys(tools)
    expect(toolNames).toHaveLength(26)
  })

  it('includes all core action tools', () => {
    const tools = createTools(mockCtx)
    const names = Object.keys(tools)
    expect(names).toContain('navigate')
    expect(names).toContain('click')
    expect(names).toContain('type')
    expect(names).toContain('press_key')
    expect(names).toContain('scroll')
    expect(names).toContain('hover')
    expect(names).toContain('select_option')
    expect(names).toContain('check')
    expect(names).toContain('uncheck')
  })

  it('includes navigation tools', () => {
    const tools = createTools(mockCtx)
    expect(Object.keys(tools)).toContain('go_back')
    expect(Object.keys(tools)).toContain('go_forward')
  })

  it('includes assertion tools', () => {
    const tools = createTools(mockCtx)
    expect(Object.keys(tools)).toContain('assert_visible')
    expect(Object.keys(tools)).toContain('assert_url')
    expect(Object.keys(tools)).toContain('assert_text_contains')
  })

  it('includes wait tools', () => {
    const tools = createTools(mockCtx)
    expect(Object.keys(tools)).toContain('wait')
    expect(Object.keys(tools)).toContain('wait_for_element')
    expect(Object.keys(tools)).toContain('wait_for_network_idle')
  })

  it('includes control tools', () => {
    const tools = createTools(mockCtx)
    expect(Object.keys(tools)).toContain('screenshot')
    expect(Object.keys(tools)).toContain('drag_and_drop')
    expect(Object.keys(tools)).toContain('generate_test_data')
    expect(Object.keys(tools)).toContain('done')
  })

  it('done tool has no execute function', () => {
    const tools = createTools(mockCtx)
    expect(tools.done.execute).toBeUndefined()
  })

  it('all tools except done have execute functions', () => {
    const tools = createTools(mockCtx)
    for (const [name, t] of Object.entries(tools)) {
      if (name === 'done') continue
      expect(t.execute, `${name} should have execute`).toBeDefined()
    }
  })

  it('all tools have descriptions', () => {
    const tools = createTools(mockCtx)
    for (const [name, t] of Object.entries(tools)) {
      expect(t.description, `${name} should have description`).toBeTruthy()
    }
  })

  it('returns updated page state after tool execution', async () => {
    let latestState: unknown
    const tools = createTools({
      ...mockCtx,
      page: {
        waitForTimeout: async (_ms: number) => {},
        screenshot: async () => Buffer.from('png'),
        locator: () => ({
          ariaSnapshot: async () => '- button "Submit"',
        }),
        evaluate: async () => ({
          fieldIssues: [
            {
              label: 'Email',
              invalid: true,
              required: true,
              messages: ['Please fill out this field.'],
            },
          ],
          liveMessages: ['Email is required'],
        }),
        url: () => 'http://localhost:3000/form',
        title: async () => 'Form',
      } as any,
      onPageStateUpdate: (state) => {
        latestState = state
      },
    })

    const result = await tools.wait.execute?.({ milliseconds: 10 })

    expect(result?.success).toBe(true)
    expect(result?.pageState).toContain('Updated Page State')
    expect(result?.pageState).toContain('Form Signals')
    expect(result?.formSignals).toContain('Email: invalid')
    expect(result?.accessibilityTree).toContain('Submit')
    expect(latestState).toMatchObject({
      formSignals: expect.stringContaining('Email: invalid'),
    })
  })
})
