import { describe, expect, it } from 'vitest'
import { buildInitialMessage, buildStateUpdateMessage } from '../../../src/agent/context.js'

const pageState = {
  screenshot: 'ZmFrZS1wbmc=',
  ariaSnapshot: '- textbox "Email"',
  formSignals: 'Invalid or flagged fields:\n- Email: required - Please fill out this field.',
  url: 'http://localhost:3000/signup',
  title: 'Sign Up',
}

describe('agent context builders', () => {
  it('includes form signals in the initial message', () => {
    const message = buildInitialMessage('Create an account', pageState)
    const content = message.content as Array<{ type: string; text?: string }>
    const textBlock = content.find((part) => part.type === 'text')

    expect(textBlock?.text).toContain('Current Page')
    expect(textBlock?.text).toContain('Accessibility Tree')
    expect(textBlock?.text).toContain('Form Signals')
    expect(textBlock?.text).toContain('Email: required')
  })

  it('includes form signals in state update messages', () => {
    const message = buildStateUpdateMessage(pageState)
    const content = message.content as Array<{ type: string; text?: string }>
    const textBlock = content.find((part) => part.type === 'text')

    expect(textBlock?.text).toContain('Updated Page State')
    expect(textBlock?.text).toContain('Form Signals')
    expect(textBlock?.text).toContain('Please fill out this field.')
  })
})
