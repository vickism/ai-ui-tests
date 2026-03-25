import { describe, it, expect } from 'vitest'
import { createModel } from '../../../src/ai/provider.js'
import type { AiUiTestsConfig } from '../../../src/config/schema.js'
import { configSchema } from '../../../src/config/schema.js'

function makeConfig(overrides: Partial<AiUiTestsConfig['ai']> = {}): AiUiTestsConfig {
  return configSchema.parse({
    baseUrl: 'http://localhost:3000',
    ai: overrides,
  })
}

describe('createModel', () => {
  it('creates an anthropic model by default', () => {
    const config = makeConfig()
    const model = createModel(config)
    expect(model).toBeDefined()
    expect(model.modelId).toContain('claude')
  })

  it('creates an openai model when configured', () => {
    const config = makeConfig({ provider: 'openai', model: 'gpt-4o' })
    const model = createModel(config)
    expect(model).toBeDefined()
    expect(model.modelId).toBe('gpt-4o')
  })

  it('throws for unsupported provider', () => {
    const config = makeConfig()
    // Force an invalid provider
    ;(config.ai as any).provider = 'invalid'
    expect(() => createModel(config)).toThrow('Unsupported AI provider')
  })

  it('uses custom model name', () => {
    const config = makeConfig({ model: 'claude-3-5-haiku-20241022' })
    const model = createModel(config)
    expect(model.modelId).toContain('haiku')
  })
})
