/**
 * Executes browser actions requested by the AI agent.
 *
 * Maps tool calls (click, type, navigate, assert, etc.) to Playwright API calls.
 * Includes a multi-strategy selector resolver that tries six strategies in order
 * to find the target element:
 *
 *   1. CSS selector  (e.g. "#login-btn", ".submit")
 *   2. Text content  (e.g. "Sign In", "Submit") — most common from AI
 *   3. ARIA role      (button, link, textbox, checkbox, radio, combobox, menuitem, tab)
 *   4. Label          (e.g. form label associations)
 *   5. Placeholder    (e.g. input placeholder text)
 *   6. Test ID        (e.g. data-testid attribute)
 *
 * This resilience allows the AI to describe elements naturally without
 * knowing the exact DOM structure.
 */

import type { Page, Locator } from 'playwright'
import { ActionError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

export interface ActionResult {
  success: boolean
  message: string
}

export interface ToolCallInput {
  name: string
  args: Record<string, unknown>
}

export async function executeAction(page: Page, action: ToolCallInput): Promise<ActionResult> {
  const { name, args } = action
  logger.debug(`Executing action: ${name}`, args)

  try {
    switch (name) {
      case 'navigate':
        return await doNavigate(page, args.url as string)

      case 'click':
        return await doClick(page, args.selector as string)

      case 'type':
        return await doType(page, args.selector as string, args.text as string)

      case 'press_key':
        return await doPressKey(page, args.key as string)

      case 'scroll':
        return await doScroll(page, args.direction as string, (args.amount as number) ?? 3)

      case 'hover':
        return await doHover(page, args.selector as string)

      case 'select_option':
        return await doSelectOption(page, args.selector as string, args.value as string)

      case 'check':
        return await doCheck(page, args.selector as string)

      case 'uncheck':
        return await doUncheck(page, args.selector as string)

      case 'go_back':
        await page.goBack({ waitUntil: 'domcontentloaded' })
        return { success: true, message: 'Navigated back' }

      case 'go_forward':
        await page.goForward({ waitUntil: 'domcontentloaded' })
        return { success: true, message: 'Navigated forward' }

      case 'upload_file':
        return await doUploadFile(page, args.selector as string, args.filePath as string)

      case 'accept_dialog':
        // Dialog handling is set up as a listener, not an action
        return {
          success: true,
          message: 'Dialog accept handler registered',
        }

      case 'dismiss_dialog':
        return {
          success: true,
          message: 'Dialog dismiss handler registered',
        }

      case 'get_text': {
        const locator = await resolveSelector(page, args.selector as string)
        const text = await locator.innerText()
        return { success: true, message: text }
      }

      case 'get_url':
        return { success: true, message: page.url() }

      case 'assert_visible':
        return await doAssertVisible(page, args.text as string)

      case 'assert_url':
        return await doAssertUrl(page, args.pattern as string)

      case 'assert_text_contains':
        return await doAssertTextContains(page, args.selector as string, args.text as string)

      case 'wait':
        await page.waitForTimeout(Math.min((args.milliseconds as number) ?? 1000, 5000))
        return { success: true, message: 'Waited' }

      case 'wait_for_element':
        return await doWaitForElement(page, args.selector as string, (args.state as string) ?? 'visible')

      case 'wait_for_network_idle':
        await page.waitForLoadState('networkidle')
        return { success: true, message: 'Network is idle' }

      case 'drag_and_drop':
        return await doDragAndDrop(page, args.from as string, args.to as string)

      case 'screenshot':
        // Handled by the agent loop — just acknowledge
        return { success: true, message: 'Screenshot captured' }

      default:
        return { success: false, message: `Unknown action: ${name}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.debug(`Action ${name} failed: ${message}`)
    return { success: false, message }
  }
}

async function resolveSelector(page: Page, selector: string): Promise<Locator> {
  // Strategy 1: Try as CSS selector
  try {
    const cssLocator = page.locator(selector).first()
    if ((await cssLocator.count()) > 0) {
      return cssLocator
    }
  } catch {
    // Not a valid CSS selector
  }

  // Strategy 2: Try by text
  const textLocator = page.getByText(selector, { exact: false }).first()
  if ((await textLocator.count()) > 0) {
    return textLocator
  }

  // Strategy 3: Try by role with name
  for (const role of ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'menuitem', 'tab'] as const) {
    const roleLocator = page.getByRole(role, { name: selector }).first()
    if ((await roleLocator.count()) > 0) {
      return roleLocator
    }
  }

  // Strategy 4: Try by label
  const labelLocator = page.getByLabel(selector).first()
  if ((await labelLocator.count()) > 0) {
    return labelLocator
  }

  // Strategy 5: Try by placeholder
  const placeholderLocator = page.getByPlaceholder(selector).first()
  if ((await placeholderLocator.count()) > 0) {
    return placeholderLocator
  }

  // Strategy 6: Try by test-id
  const testIdLocator = page.getByTestId(selector).first()
  if ((await testIdLocator.count()) > 0) {
    return testIdLocator
  }

  throw new ActionError(`Could not find element matching "${selector}"`, 'resolveSelector', selector)
}

async function doNavigate(page: Page, url: string): Promise<ActionResult> {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  return { success: true, message: `Navigated to ${url}` }
}

async function doClick(page: Page, selector: string): Promise<ActionResult> {
  const locator = await resolveSelector(page, selector)
  await locator.click()
  return { success: true, message: `Clicked "${selector}"` }
}

async function doType(page: Page, selector: string, text: string): Promise<ActionResult> {
  const locator = await resolveSelector(page, selector)
  await locator.fill(text)
  return { success: true, message: `Typed "${text}" into "${selector}"` }
}

async function doPressKey(page: Page, key: string): Promise<ActionResult> {
  await page.keyboard.press(key)
  return { success: true, message: `Pressed ${key}` }
}

async function doScroll(page: Page, direction: string, amount: number): Promise<ActionResult> {
  const delta = direction === 'up' ? -amount * 100 : amount * 100
  await page.mouse.wheel(0, delta)
  return { success: true, message: `Scrolled ${direction}` }
}

async function doHover(page: Page, selector: string): Promise<ActionResult> {
  const locator = await resolveSelector(page, selector)
  await locator.hover()
  return { success: true, message: `Hovered over "${selector}"` }
}

async function doSelectOption(page: Page, selector: string, value: string): Promise<ActionResult> {
  const locator = await resolveSelector(page, selector)
  await locator.selectOption(value)
  return { success: true, message: `Selected "${value}" in "${selector}"` }
}

async function doCheck(page: Page, selector: string): Promise<ActionResult> {
  const locator = await resolveSelector(page, selector)
  await locator.check()
  return { success: true, message: `Checked "${selector}"` }
}

async function doUncheck(page: Page, selector: string): Promise<ActionResult> {
  const locator = await resolveSelector(page, selector)
  await locator.uncheck()
  return { success: true, message: `Unchecked "${selector}"` }
}

async function doUploadFile(page: Page, selector: string, filePath: string): Promise<ActionResult> {
  const locator = await resolveSelector(page, selector)
  await locator.setInputFiles(filePath)
  return { success: true, message: `Uploaded ${filePath}` }
}

async function doAssertVisible(page: Page, text: string): Promise<ActionResult> {
  const locator = page.getByText(text, { exact: false }).first()
  const visible = await locator.isVisible().catch(() => false)
  if (visible) {
    return { success: true, message: `Text "${text}" is visible` }
  }
  return {
    success: false,
    message: `Text "${text}" is not visible on the page`,
  }
}

async function doAssertUrl(page: Page, pattern: string): Promise<ActionResult> {
  const currentUrl = page.url()
  if (currentUrl.includes(pattern) || new RegExp(pattern).test(currentUrl)) {
    return { success: true, message: `URL matches "${pattern}"` }
  }
  return {
    success: false,
    message: `URL "${currentUrl}" does not match "${pattern}"`,
  }
}

async function doAssertTextContains(page: Page, selector: string, text: string): Promise<ActionResult> {
  const locator = await resolveSelector(page, selector)
  const content = await locator.innerText()
  if (content.includes(text)) {
    return {
      success: true,
      message: `Element "${selector}" contains "${text}"`,
    }
  }
  return {
    success: false,
    message: `Element "${selector}" text "${content}" does not contain "${text}"`,
  }
}

async function doWaitForElement(page: Page, selector: string, state: string): Promise<ActionResult> {
  const locator = await resolveSelector(page, selector)
  const validStates = ['visible', 'hidden', 'attached', 'detached'] as const
  const resolvedState = validStates.includes(state as (typeof validStates)[number]) ? (state as (typeof validStates)[number]) : 'visible'
  await locator.waitFor({ state: resolvedState })
  return {
    success: true,
    message: `Element "${selector}" is ${resolvedState}`,
  }
}

async function doDragAndDrop(page: Page, from: string, to: string): Promise<ActionResult> {
  const source = await resolveSelector(page, from)
  const target = await resolveSelector(page, to)
  await source.dragTo(target)
  return { success: true, message: `Dragged "${from}" to "${to}"` }
}
