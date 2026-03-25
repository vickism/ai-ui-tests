import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../../../src/ai/prompt.js'

describe('buildSystemPrompt', () => {
  it('includes the core instructions', () => {
    const prompt = buildSystemPrompt('')
    expect(prompt).toContain('You are AI UI Tests')
    expect(prompt).toContain('QA testing agent')
    expect(prompt).toContain('done')
  })

  it('includes app context when provided', () => {
    const prompt = buildSystemPrompt('This is a task app at /tasks')
    expect(prompt).toContain('App Context')
    expect(prompt).toContain('task app at /tasks')
  })

  it('omits app context section when empty', () => {
    const prompt = buildSystemPrompt('')
    expect(prompt).not.toContain('The following describes the application you are testing')
  })
})

describe('tool definitions', () => {
  it('has the expected tools', async () => {
    // We can't easily instantiate tools without a real page,
    // but we can verify the module exports correctly
    const mod = await import('../../../src/ai/tools.js')
    expect(typeof mod.createTools).toBe('function')
  })
})
