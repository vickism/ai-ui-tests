import { z } from 'zod';
import { tool } from 'ai';
import type { Page } from 'playwright';
import { executeAction } from '../browser/actions.js';
import { capturePageState, type PageState } from '../browser/page-state.js';
import { logger } from '../utils/logger.js';
import fs from 'node:fs';
import path from 'node:path';

export interface ToolContext {
  page: Page;
  screenshotDir: string;
  testName: string;
  stepCount: number;
  onPageStateUpdate: (state: PageState) => void;
}

function makeExecute(ctx: ToolContext, name: string) {
  return async (args: Record<string, unknown>) => {
    const result = await executeAction(ctx.page, { name, args });
    ctx.stepCount++;
    const newState = await capturePageState(ctx.page);
    ctx.onPageStateUpdate(newState);
    return {
      ...result,
      currentUrl: newState.url,
      pageTitle: newState.title,
    };
  };
}

export function createTools(ctx: ToolContext) {
  const exec = (name: string) => makeExecute(ctx, name);

  return {
    navigate: tool({
      description: 'Navigate to a URL',
      inputSchema: z.object({
        url: z.string().describe('The URL to navigate to'),
      }),
      execute: async ({ url }: { url: string }) => exec('navigate')({ url }),
    }),

    click: tool({
      description:
        'Click an element. Use text content, CSS selector, ARIA label, or role name.',
      inputSchema: z.object({
        selector: z
          .string()
          .describe('Text content, CSS selector, ARIA label, or role name of the element to click'),
      }),
      execute: async ({ selector }: { selector: string }) => exec('click')({ selector }),
    }),

    type: tool({
      description: 'Type text into an input field',
      inputSchema: z.object({
        selector: z
          .string()
          .describe('Text, CSS selector, label, or placeholder of the input'),
        text: z.string().describe('The text to type'),
      }),
      execute: async ({ selector, text }: { selector: string; text: string }) =>
        exec('type')({ selector, text }),
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
        amount: z
          .number()
          .optional()
          .describe('Number of scroll ticks (default 3)'),
      }),
      execute: async ({ direction, amount }: { direction: string; amount?: number }) =>
        exec('scroll')({ direction, amount }),
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
      inputSchema: z.object({
        selector: z.string().describe('The select element'),
        value: z.string().describe('The option value or text to select'),
      }),
      execute: async ({ selector, value }: { selector: string; value: string }) =>
        exec('select_option')({ selector, value }),
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
      execute: async ({ selector, filePath }: { selector: string; filePath: string }) =>
        exec('upload_file')({ selector, filePath }),
    }),

    accept_dialog: tool({
      description: 'Accept a browser dialog (alert, confirm, prompt)',
      inputSchema: z.object({
        promptText: z
          .string()
          .optional()
          .describe('Text to enter in a prompt dialog'),
      }),
      execute: async ({ promptText }: { promptText?: string }) =>
        exec('accept_dialog')({ promptText }),
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
      inputSchema: z.object({
        text: z.string().describe('The text that should be visible'),
      }),
      execute: async ({ text }: { text: string }) => exec('assert_visible')({ text }),
    }),

    assert_url: tool({
      description: 'Assert the current URL matches a pattern',
      inputSchema: z.object({
        pattern: z
          .string()
          .describe('URL pattern (substring or regex) to match against'),
      }),
      execute: async ({ pattern }: { pattern: string }) => exec('assert_url')({ pattern }),
    }),

    assert_text_contains: tool({
      description: 'Assert an element contains specific text',
      inputSchema: z.object({
        selector: z.string().describe('Element to check'),
        text: z.string().describe('Text the element should contain'),
      }),
      execute: async ({ selector, text }: { selector: string; text: string }) =>
        exec('assert_text_contains')({ selector, text }),
    }),

    wait: tool({
      description: 'Wait for a specified time (max 5 seconds)',
      inputSchema: z.object({
        milliseconds: z
          .number()
          .describe('Time to wait in milliseconds (max 5000)'),
      }),
      execute: async ({ milliseconds }: { milliseconds: number }) =>
        exec('wait')({ milliseconds }),
    }),

    wait_for_element: tool({
      description: 'Wait until an element reaches a specific state',
      inputSchema: z.object({
        selector: z.string().describe('Element to wait for'),
        state: z
          .enum(['visible', 'hidden', 'attached', 'detached'])
          .describe('Target state'),
      }),
      execute: async ({ selector, state }: { selector: string; state: string }) =>
        exec('wait_for_element')({ selector, state }),
    }),

    wait_for_network_idle: tool({
      description:
        'Wait until all network requests have finished. Useful after navigation or form submissions.',
      inputSchema: z.object({}),
      execute: async () => exec('wait_for_network_idle')({}),
    }),

    drag_and_drop: tool({
      description: 'Drag an element and drop it onto another element',
      inputSchema: z.object({
        from: z.string().describe('Source element selector'),
        to: z.string().describe('Target element selector'),
      }),
      execute: async ({ from, to }: { from: string; to: string }) =>
        exec('drag_and_drop')({ from, to }),
    }),

    screenshot: tool({
      description: 'Take a screenshot and save it to disk',
      inputSchema: z.object({}),
      execute: async () => {
        ctx.stepCount++;
        const state = await capturePageState(ctx.page);
        ctx.onPageStateUpdate(state);

        const sanitizedName = ctx.testName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const dir = path.join(ctx.screenshotDir, sanitizedName);
        fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(
          dir,
          `step-${String(ctx.stepCount).padStart(3, '0')}.png`
        );
        fs.writeFileSync(filePath, Buffer.from(state.screenshot, 'base64'));
        logger.debug(`Screenshot saved: ${filePath}`);

        return {
          success: true,
          message: `Screenshot saved to ${filePath}`,
          currentUrl: state.url,
          pageTitle: state.title,
        };
      },
    }),

    done: tool({
      description:
        'Finish the test. Call this when you have determined whether the test passes or fails.',
      inputSchema: z.object({
        pass: z.boolean().describe('Whether the test passed'),
        reason: z
          .string()
          .describe('Explanation of why the test passed or failed'),
      }),
    }),
  };
}
