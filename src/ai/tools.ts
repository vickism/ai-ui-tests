/**
 * Defines the tools available to the AI agent during test execution.
 *
 * Each tool wraps a Playwright browser action (click, type, navigate, etc.)
 * using the Vercel AI SDK's tool() function with Zod input schemas. After
 * every tool execution, the page state (ARIA tree + form signals, plus screenshot capture for storage)
 * is captured and returned in the tool result for the AI's next decision.
 *
 * The special `done` tool has no execute function — the agent loop detects
 * it in the step results to determine test pass/fail.
 *
 * Tool categories:
 *   - Actions (13): navigate, click, type, press_key, scroll, hover, etc.
 *   - Dialogs (2): accept_dialog, dismiss_dialog
 *   - Reading (2): get_text, get_url
 *   - Assertions (3): assert_visible, assert_url, assert_text_contains
 *   - Waiting (3): wait, wait_for_element, wait_for_network_idle
 *   - Control (2): screenshot, done
 *   - Data (1): generate_test_data
 */

import { tool } from 'ai'
import fs from 'node:fs'
import path from 'node:path'
import type { Page } from 'playwright'
import { z } from 'zod'
import { executeAction } from '../browser/actions.js'
import { capturePageState, formatPageStateForModel, type PageState } from '../browser/page-state.js'
import { TEST_DATA_KINDS, type TestDataFieldSpec, type TestDataSession } from '../test-data/session.js'
import { logger } from '../utils/logger.js'

export interface ToolContext {
  page: Page
  screenshotDir: string
  testName: string
  stepCount: number
  testDataSession: TestDataSession
  onPageStateUpdate: (state: PageState) => void
}

const testDataFieldSchema = z.object({
  key: z.string().describe('The field key to store, e.g. fullName or email'),
  kind: z.enum(TEST_DATA_KINDS).describe('The kind of realistic fake data to generate'),
  unique: z.boolean().optional().describe('Whether to force a run-specific unique variant'),
  prefix: z.string().optional().describe('Optional prefix for text fields, e.g. "QA Borrower"'),
  suffix: z.string().optional().describe('Optional suffix for text fields'),
  domain: z.string().optional().describe('Optional domain for email generation, e.g. test.local'),
  min: z.number().optional().describe('Optional minimum numeric value'),
  max: z.number().optional().describe('Optional maximum numeric value'),
  decimals: z.number().int().min(0).max(4).optional().describe('Decimal places for finance.amount'),
})

const typeInputSchema = z
  .object({
    selector: z.string().describe('Text, CSS selector, label, or placeholder of the input'),
    text: z.string().optional().describe('The literal text to type'),
    textRef: z.string().optional().describe('Reference to stored test data, e.g. borrower.fullName'),
  })
  .refine((input) => Boolean(input.text || input.textRef), {
    message: 'Provide text or textRef',
    path: ['text'],
  })

const selectOptionInputSchema = z
  .object({
    selector: z.string().describe('The select element'),
    value: z.string().optional().describe('The literal option value or text to select'),
    valueRef: z.string().optional().describe('Reference to stored test data, e.g. loan.amount'),
  })
  .refine((input) => Boolean(input.value || input.valueRef), {
    message: 'Provide value or valueRef',
    path: ['value'],
  })

const visibleAssertionInputSchema = z
  .object({
    text: z.string().optional().describe('The literal text that should be visible'),
    textRef: z.string().optional().describe('Reference to stored test data, e.g. borrower.fullName'),
  })
  .refine((input) => Boolean(input.text || input.textRef), {
    message: 'Provide text or textRef',
    path: ['text'],
  })

const textContainsInputSchema = z
  .object({
    selector: z.string().describe('Element to check'),
    text: z.string().optional().describe('Literal text the element should contain'),
    textRef: z.string().optional().describe('Reference to stored test data, e.g. borrower.email'),
  })
  .refine((input) => Boolean(input.text || input.textRef), {
    message: 'Provide text or textRef',
    path: ['text'],
  })

async function withUpdatedPageState<T extends object>(
  ctx: ToolContext,
  result: T,
): Promise<T & { currentUrl: string; pageTitle: string; accessibilityTree: string; formSignals: string; pageState: string }> {
  ctx.stepCount++
  const newState = await capturePageState(ctx.page)
  ctx.onPageStateUpdate(newState)
  return {
    ...result,
    currentUrl: newState.url,
    pageTitle: newState.title,
    accessibilityTree: newState.ariaSnapshot,
    formSignals: newState.formSignals,
    pageState: formatPageStateForModel(newState, 'Updated Page State'),
  }
}

function makeExecute(ctx: ToolContext, name: string) {
  return async (args: Record<string, unknown>) => {
    let resolvedArgs: Record<string, unknown>
    try {
      resolvedArgs = resolveActionArgs(ctx, name, args)
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) }
    }
    const result = await executeAction(ctx.page, { name, args: resolvedArgs })
    return withUpdatedPageState(ctx, result)
  }
}

export function createTools(ctx: ToolContext) {
  const exec = (name: string) => makeExecute(ctx, name)

  return {
    navigate: tool({
      description: 'Navigate to a URL',
      inputSchema: z.object({
        url: z.string().describe('The URL to navigate to'),
      }),
      execute: async ({ url }: { url: string }) => exec('navigate')({ url }),
    }),

    click: tool({
      description: 'Click an element. Use text content, CSS selector, ARIA label, or role name.',
      inputSchema: z.object({
        selector: z.string().describe('Text content, CSS selector, ARIA label, or role name of the element to click'),
      }),
      execute: async ({ selector }: { selector: string }) => exec('click')({ selector }),
    }),

    type: tool({
      description: 'Type text into an input field',
      inputSchema: typeInputSchema,
      execute: async ({ selector, text, textRef }: { selector: string; text?: string; textRef?: string }) =>
        exec('type')({ selector, text, textRef }),
    }),

    press_key: tool({
      description: 'Press a keyboard key (Enter, Tab, Escape, ArrowDown, etc.)',
      inputSchema: z.object({
        key: z.string().describe('Key name to press'),
      }),
      execute: async ({ key }: { key: string }) => exec('press_key')({ key }),
    }),

    scroll: tool({
      description: 'Scroll the page up or down',
      inputSchema: z.object({
        direction: z.enum(['up', 'down']).describe('Scroll direction'),
        amount: z.number().optional().describe('Number of scroll ticks (default 3)'),
      }),
      execute: async ({ direction, amount }: { direction: string; amount?: number }) => exec('scroll')({ direction, amount }),
    }),

    hover: tool({
      description: 'Hover over an element to reveal tooltips or dropdown menus',
      inputSchema: z.object({
        selector: z.string().describe('Element to hover over'),
      }),
      execute: async ({ selector }: { selector: string }) => exec('hover')({ selector }),
    }),

    select_option: tool({
      description: 'Select an option from a dropdown/select element',
      inputSchema: selectOptionInputSchema,
      execute: async ({ selector, value, valueRef }: { selector: string; value?: string; valueRef?: string }) =>
        exec('select_option')({ selector, value, valueRef }),
    }),

    check: tool({
      description: 'Check a checkbox or radio button',
      inputSchema: z.object({
        selector: z.string().describe('The checkbox or radio to check'),
      }),
      execute: async ({ selector }: { selector: string }) => exec('check')({ selector }),
    }),

    uncheck: tool({
      description: 'Uncheck a checkbox',
      inputSchema: z.object({
        selector: z.string().describe('The checkbox to uncheck'),
      }),
      execute: async ({ selector }: { selector: string }) => exec('uncheck')({ selector }),
    }),

    go_back: tool({
      description: 'Go back in browser history',
      inputSchema: z.object({}),
      execute: async () => exec('go_back')({}),
    }),

    go_forward: tool({
      description: 'Go forward in browser history',
      inputSchema: z.object({}),
      execute: async () => exec('go_forward')({}),
    }),

    upload_file: tool({
      description: 'Upload a file to a file input element',
      inputSchema: z.object({
        selector: z.string().describe('The file input element'),
        filePath: z.string().describe('Path to the file to upload'),
      }),
      execute: async ({ selector, filePath }: { selector: string; filePath: string }) => exec('upload_file')({ selector, filePath }),
    }),

    accept_dialog: tool({
      description: 'Accept a browser dialog (alert, confirm, prompt)',
      inputSchema: z.object({
        promptText: z.string().optional().describe('Text to enter in a prompt dialog'),
      }),
      execute: async ({ promptText }: { promptText?: string }) => exec('accept_dialog')({ promptText }),
    }),

    dismiss_dialog: tool({
      description: 'Dismiss a browser dialog',
      inputSchema: z.object({}),
      execute: async () => exec('dismiss_dialog')({}),
    }),

    get_text: tool({
      description: 'Read the text content of an element',
      inputSchema: z.object({
        selector: z.string().describe('Element to read text from'),
      }),
      execute: async ({ selector }: { selector: string }) => exec('get_text')({ selector }),
    }),

    get_url: tool({
      description: 'Get the current page URL',
      inputSchema: z.object({}),
      execute: async () => exec('get_url')({}),
    }),

    assert_visible: tool({
      description: 'Assert that specific text is visible on the page',
      inputSchema: visibleAssertionInputSchema,
      execute: async ({ text, textRef }: { text?: string; textRef?: string }) => exec('assert_visible')({ text, textRef }),
    }),

    assert_url: tool({
      description: 'Assert the current URL matches a pattern',
      inputSchema: z.object({
        pattern: z.string().describe('URL pattern (substring or regex) to match against'),
      }),
      execute: async ({ pattern }: { pattern: string }) => exec('assert_url')({ pattern }),
    }),

    assert_text_contains: tool({
      description: 'Assert an element contains specific text',
      inputSchema: textContainsInputSchema,
      execute: async ({ selector, text, textRef }: { selector: string; text?: string; textRef?: string }) =>
        exec('assert_text_contains')({ selector, text, textRef }),
    }),

    wait: tool({
      description: 'Wait for a specified time (max 5 seconds)',
      inputSchema: z.object({
        milliseconds: z.number().describe('Time to wait in milliseconds (max 5000)'),
      }),
      execute: async ({ milliseconds }: { milliseconds: number }) => exec('wait')({ milliseconds }),
    }),

    wait_for_element: tool({
      description: 'Wait until an element reaches a specific state',
      inputSchema: z.object({
        selector: z.string().describe('Element to wait for'),
        state: z.enum(['visible', 'hidden', 'attached', 'detached']).describe('Target state'),
      }),
      execute: async ({ selector, state }: { selector: string; state: string }) => exec('wait_for_element')({ selector, state }),
    }),

    wait_for_network_idle: tool({
      description: 'Wait until all network requests have finished. Useful after navigation or form submissions.',
      inputSchema: z.object({}),
      execute: async () => exec('wait_for_network_idle')({}),
    }),

    drag_and_drop: tool({
      description: 'Drag an element and drop it onto another element',
      inputSchema: z.object({
        from: z.string().describe('Source element selector'),
        to: z.string().describe('Target element selector'),
      }),
      execute: async ({ from, to }: { from: string; to: string }) => exec('drag_and_drop')({ from, to }),
    }),

    generate_test_data: tool({
      description:
        'Generate realistic fake data for the current test and store it under an alias. Reuse it later with textRef/valueRef, e.g. borrower.fullName.',
      inputSchema: z.object({
        alias: z.string().describe('Stable alias for this entity, e.g. borrower, user, company'),
        fields: z.array(testDataFieldSchema).min(1).describe('Fields to generate and store under the alias'),
      }),
      execute: async ({ alias, fields }: { alias: string; fields: TestDataFieldSpec[] }) => {
        try {
          const generated = ctx.testDataSession.generate(alias, fields)
          return withUpdatedPageState(ctx, {
            success: true,
            message: `Generated test data for "${generated.alias}" with ${generated.createdKeys.length} new field(s)`,
            alias: generated.alias,
            createdKeys: generated.createdKeys,
            reusedKeys: generated.reusedKeys,
            runId: generated.runId,
            seed: generated.seed,
            values: generated.values,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return withUpdatedPageState(ctx, {
            success: false,
            message,
          })
        }
      },
    }),

    screenshot: tool({
      description: 'Take a screenshot and save it to disk',
      inputSchema: z.object({}),
      execute: async () => {
        ctx.stepCount++
        const state = await capturePageState(ctx.page)
        ctx.onPageStateUpdate(state)

        const sanitizedName = ctx.testName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        const dir = path.join(ctx.screenshotDir, sanitizedName)
        fs.mkdirSync(dir, { recursive: true })
        const filePath = path.join(dir, `step-${String(ctx.stepCount).padStart(3, '0')}.png`)
        fs.writeFileSync(filePath, Buffer.from(state.screenshot, 'base64'))
        logger.debug(`Screenshot saved: ${filePath}`)

        return {
          success: true,
          message: `Screenshot saved to ${filePath}`,
          currentUrl: state.url,
          pageTitle: state.title,
          accessibilityTree: state.ariaSnapshot,
          formSignals: state.formSignals,
          pageState: formatPageStateForModel(state, 'Updated Page State'),
        }
      },
    }),

    done: tool({
      description: 'Finish the test. Call this when you have determined whether the test passes or fails.',
      inputSchema: z.object({
        pass: z.boolean().describe('Whether the test passed'),
        reason: z.string().describe('Explanation of why the test passed or failed'),
      }),
    }),
  }
}

function resolveActionArgs(ctx: ToolContext, name: string, args: Record<string, unknown>): Record<string, unknown> {
  switch (name) {
    case 'type':
      return {
        selector: requireStringArg(args, 'selector'),
        text: resolveStringInput(ctx, args, 'text', 'textRef'),
      }

    case 'select_option':
      return {
        selector: requireStringArg(args, 'selector'),
        value: resolveStringInput(ctx, args, 'value', 'valueRef'),
      }

    case 'assert_visible':
      return {
        text: resolveStringInput(ctx, args, 'text', 'textRef'),
      }

    case 'assert_text_contains':
      return {
        selector: requireStringArg(args, 'selector'),
        text: resolveStringInput(ctx, args, 'text', 'textRef'),
      }

    default:
      return args
  }
}

function requireStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required argument "${key}".`)
  }

  return value
}

function resolveStringInput(ctx: ToolContext, args: Record<string, unknown>, valueKey: string, refKey: string): string {
  const ref = args[refKey]
  if (typeof ref === 'string' && ref.trim() !== '') {
    return ctx.testDataSession.resolve(ref)
  }

  return requireStringArg(args, valueKey)
}
