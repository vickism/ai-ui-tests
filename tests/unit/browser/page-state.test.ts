import { describe, expect, it } from 'vitest'
import { NO_FORM_SIGNALS, captureFormSignals, capturePageState, formatPageStateForModel } from '../../../src/browser/page-state.js'

describe('page-state capture', () => {
  it('formats page state for the model with form signals', () => {
    const formatted = formatPageStateForModel(
      {
        screenshot: 'ZmFrZQ==',
        ariaSnapshot: '- button "Save"',
        formSignals: 'Invalid or flagged fields:\n- Name: required - Please fill out this field.',
        url: 'http://localhost:3000/form',
        title: 'Form',
      },
      'Updated Page State',
    )

    expect(formatted).toContain('Updated Page State')
    expect(formatted).toContain('Accessibility Tree')
    expect(formatted).toContain('Form Signals')
    expect(formatted).toContain('Name: required')
  })

  it('summarizes invalid fields and live messages', async () => {
    const page = {
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
    } as any

    const summary = await captureFormSignals(page)

    expect(summary).toContain('Invalid or flagged fields:')
    expect(summary).toContain('Email: invalid')
    expect(summary).toContain('Visible live messages:')
    expect(summary).toContain('Email is required')
  })

  it('falls back when form signal capture fails', async () => {
    const page = {
      evaluate: async () => {
        throw new Error('No DOM')
      },
    } as any

    await expect(captureFormSignals(page)).resolves.toBe(NO_FORM_SIGNALS)
  })

  it('includes form signals in captured page state', async () => {
    const page = {
      screenshot: async () => Buffer.from('png'),
      locator: () => ({
        ariaSnapshot: async () => '- button "Submit"',
      }),
      evaluate: async () => ({
        fieldIssues: [
          {
            label: 'Password',
            invalid: true,
            required: false,
            messages: ['Password must be at least 8 characters'],
          },
        ],
        liveMessages: [],
      }),
      url: () => 'http://localhost:3000/signup',
      title: async () => 'Sign Up',
    } as any

    const state = await capturePageState(page)

    expect(state.formSignals).toContain('Password: invalid')
    expect(state.ariaSnapshot).toContain('Submit')
    expect(state.url).toBe('http://localhost:3000/signup')
  })
})
