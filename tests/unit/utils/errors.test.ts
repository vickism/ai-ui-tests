import { describe, it, expect } from 'vitest'
import { AiUiTestsError, ConfigError, ParseError, BrowserError, ActionError, AIError } from '../../../src/utils/errors.js'

describe('custom errors', () => {
  it('AiUiTestsError has correct name and message', () => {
    const err = new AiUiTestsError('test message')
    expect(err.name).toBe('AiUiTestsError')
    expect(err.message).toBe('test message')
    expect(err).toBeInstanceOf(Error)
  })

  it('ConfigError extends AiUiTestsError', () => {
    const err = new ConfigError('bad config')
    expect(err.name).toBe('ConfigError')
    expect(err).toBeInstanceOf(AiUiTestsError)
    expect(err).toBeInstanceOf(Error)
  })

  it('ParseError extends AiUiTestsError', () => {
    const err = new ParseError('bad parse')
    expect(err.name).toBe('ParseError')
    expect(err).toBeInstanceOf(AiUiTestsError)
  })

  it('BrowserError extends AiUiTestsError', () => {
    const err = new BrowserError('browser fail')
    expect(err.name).toBe('BrowserError')
    expect(err).toBeInstanceOf(AiUiTestsError)
  })

  it('ActionError stores action and selector', () => {
    const err = new ActionError('not found', 'click', '#btn')
    expect(err.name).toBe('ActionError')
    expect(err.action).toBe('click')
    expect(err.selector).toBe('#btn')
    expect(err).toBeInstanceOf(AiUiTestsError)
  })

  it('ActionError works without selector', () => {
    const err = new ActionError('failed', 'navigate')
    expect(err.selector).toBeUndefined()
  })

  it('AIError extends AiUiTestsError', () => {
    const err = new AIError('ai fail')
    expect(err.name).toBe('AIError')
    expect(err).toBeInstanceOf(AiUiTestsError)
  })
})
