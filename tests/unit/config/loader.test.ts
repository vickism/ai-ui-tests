import { describe, it, expect } from 'vitest'
import { configSchema } from '../../../src/config/schema.js'

describe('configSchema', () => {
  it('accepts a minimal valid config', () => {
    const result = configSchema.safeParse({
      baseUrl: 'http://localhost:3000',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ai.provider).toBe('anthropic')
      expect(result.data.browser.headless).toBe(true)
      expect(result.data.screenshots.onFailure).toBe(true)
    }
  })

  it('applies defaults for all nested fields', () => {
    const result = configSchema.parse({
      baseUrl: 'http://localhost:3000',
    })
    expect(result.ai.model).toBe('claude-sonnet-4-20250514')
    expect(result.ai.maxIterations).toBe(30)
    expect(result.browser.viewport.width).toBe(1280)
    expect(result.browser.viewport.height).toBe(720)
    expect(result.browser.timeout).toBe(30000)
    expect(result.browser.browserType).toBe('chromium')
    expect(result.screenshots.dir).toBe('./ai-ui-tests-screenshots')
    expect(result.reporter).toBe('console')
  })

  it('rejects invalid baseUrl', () => {
    const result = configSchema.safeParse({
      baseUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a full config', () => {
    const result = configSchema.safeParse({
      baseUrl: 'https://myapp.com',
      ai: {
        provider: 'openai',
        model: 'gpt-4o',
        maxIterations: 50,
      },
      browser: {
        headless: false,
        viewport: { width: 1920, height: 1080 },
        timeout: 60000,
        browserType: 'firefox',
      },
      screenshots: {
        dir: './my-screenshots',
        onFailure: true,
        onSuccess: true,
      },
      reporter: 'html',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ai.provider).toBe('openai')
      expect(result.data.browser.browserType).toBe('firefox')
      expect(result.data.reporter).toBe('html')
    }
  })

  it('rejects invalid provider', () => {
    const result = configSchema.safeParse({
      baseUrl: 'http://localhost:3000',
      ai: { provider: 'invalid' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects maxIterations out of range', () => {
    const result = configSchema.safeParse({
      baseUrl: 'http://localhost:3000',
      ai: { maxIterations: 0 },
    })
    expect(result.success).toBe(false)
  })
})
