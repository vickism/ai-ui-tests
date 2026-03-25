/// <reference lib="dom" />

/**
 * Captures the current state of a browser page for the AI to observe.
 *
 * Returns three representations:
 *   - Screenshot: base64 PNG image — gives the AI visual context
 *   - ARIA snapshot: structured accessibility tree — gives the AI machine-readable
 *     element info (roles, names, labels) for precise selector targeting
 *   - Form signals: compact validation-focused summary of invalid fields and alerts
 *
 * All three are captured in parallel after every tool execution and sent to
 * the AI in the next message.
 */

import type { Page } from 'playwright'
import { logger } from '../utils/logger.js'

export interface PageState {
  screenshot: string
  ariaSnapshot: string
  formSignals: string
  url: string
  title: string
}

type FormControlElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

interface FormSignalSnapshot {
  fieldIssues: Array<{
    label: string
    invalid: boolean
    required: boolean
    messages: string[]
  }>
  liveMessages: string[]
}

export const NO_FORM_SIGNALS = 'No visible form validation errors detected.'

export async function captureScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({ type: 'png', fullPage: false })
  return buffer.toString('base64')
}

export async function captureAriaSnapshot(page: Page): Promise<string> {
  try {
    const snapshot = await page.locator('body').ariaSnapshot()
    return snapshot
  } catch (err) {
    logger.debug(`ARIA snapshot failed, falling back to text content: ${err instanceof Error ? err.message : String(err)}`)
    return await page.innerText('body').catch(() => '(empty page)')
  }
}

export async function captureFormSignals(page: Page): Promise<string> {
  try {
    const snapshot = await page.evaluate<FormSignalSnapshot>(() => {
      const normalize = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()

      const isVisible = (element: Element | null): boolean => {
        if (!element) {
          return false
        }

        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return (
          !element.hasAttribute('hidden') &&
          element.getAttribute('aria-hidden') !== 'true' &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0
        )
      }

      const readReferencedText = (element: Element, attribute: string): string[] => {
        const value = element.getAttribute(attribute)
        if (!value) {
          return []
        }

        const messages = value
          .split(/\s+/)
          .map((id: string) => normalize(document.getElementById(id)?.textContent))
          .filter(Boolean)

        return messages.filter((message: string, index: number) => messages.indexOf(message) === index)
      }

      const getFieldLabel = (element: FormControlElement): string => {
        const ariaLabel = normalize(element.getAttribute('aria-label'))
        if (ariaLabel) {
          return ariaLabel
        }

        const id = normalize(element.id)
        if (id) {
          const explicitLabel = Array.from(document.querySelectorAll<HTMLLabelElement>('label')).find(
            (label) => normalize(label.htmlFor) === id,
          )
          const explicitText = normalize(explicitLabel?.textContent)
          if (explicitText) {
            return explicitText
          }
        }

        const wrappedLabel = normalize(element.closest('label')?.textContent)
        if (wrappedLabel) {
          return wrappedLabel
        }

        const placeholder = normalize(element.getAttribute('placeholder'))
        if (placeholder) {
          return placeholder
        }

        const name = normalize(element.getAttribute('name'))
        if (name) {
          return name
        }

        const testId = normalize(element.getAttribute('data-testid'))
        if (testId) {
          return testId
        }

        return id || normalize(element.tagName)?.toLowerCase() || 'field'
      }

      const fieldIssues = Array.from(document.querySelectorAll<FormControlElement>('input, textarea, select'))
        .filter((element) => isVisible(element))
        .map((element) => {
          const messages = new Set<string>()

          const validationMessage = normalize(typeof element.validationMessage === 'string' ? element.validationMessage : '')
          if (validationMessage) {
            messages.add(validationMessage)
          }

          const invalid = element.getAttribute('aria-invalid') === 'true' || element.validity.valid === false
          const required =
            element.required === true || element.getAttribute('aria-required') === 'true' || Boolean(element.validity.valueMissing)

          // aria-errormessage is always a validation source
          for (const message of readReferencedText(element, 'aria-errormessage')) {
            messages.add(message)
          }

          // aria-describedby is only a validation source when the field is already invalid
          // (used by react-hook-form, MUI, react-aria etc. to reference error text)
          if (invalid) {
            for (const message of readReferencedText(element, 'aria-describedby')) {
              messages.add(message)
            }
          }

          return {
            label: getFieldLabel(element),
            invalid,
            required,
            messages: Array.from(messages),
          }
        })
        .filter((issue) => issue.invalid || issue.messages.length > 0)

      const liveMessages = Array.from(document.querySelectorAll('[role="alert"], [aria-live="assertive"], [aria-live="polite"]'))
        .filter((element) => isVisible(element))
        .map((element) => normalize(element.textContent))
        .filter(Boolean)
        .filter((message: string, index: number, all: string[]) => all.indexOf(message) === index)

      return {
        fieldIssues,
        liveMessages,
      }
    })

    const sections: string[] = []

    if (snapshot.fieldIssues.length > 0) {
      sections.push(
        [
          'Invalid or flagged fields:',
          ...snapshot.fieldIssues.map((issue) => {
            const state = issue.invalid ? 'invalid' : issue.required ? 'required' : 'flagged'
            const details = issue.messages.length > 0 ? ` - ${issue.messages.join(' | ')}` : ''
            return `- ${issue.label}: ${state}${details}`
          }),
        ].join('\n'),
      )
    }

    if (snapshot.liveMessages.length > 0) {
      sections.push(['Visible live messages:', ...snapshot.liveMessages.map((message) => `- ${message}`)].join('\n'))
    }

    return sections.length > 0 ? sections.join('\n\n') : NO_FORM_SIGNALS
  } catch (err) {
    logger.debug(`Form signal capture failed: ${err instanceof Error ? err.message : String(err)}`)
    return NO_FORM_SIGNALS
  }
}

export function formatPageStateForModel(pageState: PageState, heading: string): string {
  return `## ${heading}\n\nURL: ${pageState.url}\nTitle: ${pageState.title}\n\n## Accessibility Tree\n\n${pageState.ariaSnapshot}\n\n## Form Signals\n\n${pageState.formSignals}`
}

export async function capturePageState(page: Page): Promise<PageState> {
  const [screenshot, ariaSnapshot, formSignals, url, title] = await Promise.all([
    captureScreenshot(page),
    captureAriaSnapshot(page),
    captureFormSignals(page),
    Promise.resolve(page.url()),
    page.title(),
  ])

  return { screenshot, ariaSnapshot, formSignals, url, title }
}
