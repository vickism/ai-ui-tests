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

export function createTools(ctx: ToolContext) {
  const makeExecute = (name: string) => {
    return async (args: Record<string, unknown>) => {
      const result = await executeAction(ctx.page, { name, args });
      ctx.stepCount++;

      // Capture new state after action
      const newState = await capturePageState(ctx.page);
      ctx.onPageStateUpdate(newState);

      return {
        ...result,
        currentUrl: newState.url,
        pageTitle: newState.title,
      };
    };
  };

  return {
    navigate: tool({
      description: 'Navigate to a URL',
      parameters: z.object({
        url: z.string().describe('The URL to navigate to'),
      }),
      execute: async (args) => makeExecute('navigate')(args),
    }),

    click: tool({
      description:
        'Click an element. Use text content, CSS selector, ARIA label, or role name.',
      parameters: z.object({
        selector: z
          .string()
          .describe('Text content, CSS selector, ARIA label, or role name of the element to click'),
      }),
      execute: async (args) => makeExecute('click')(args),
    }),

    type: tool({
      description: 'Type text into an input field',
      parameters: z.object({
        selector: z
          .string()
          .describe('Text, CSS selector, label, or placeholder of the input'),
        text: z.string().describe('The text to type'),
      }),
      execute: async (args) => makeExecute('type')(args),
    }),

    press_key: tool({
      description: 'Press a keyboard key (Enter, Tab, Escape, ArrowDown, etc.)',
      parameters: z.object({
        key: z.string().describe('Key name to press'),
      }),
      execute: async (args) => makeExecute('press_key')(args),
    }),

    scroll: tool({
      description: 'Scroll the page up or down',
      parameters: z.object({
        direction: z.enum(['up', 'down']).describe('Scroll direction'),
        amount: z
          .number()
          .optional()
          .describe('Number of scroll ticks (default 3)'),
      }),
      execute: async (args) => makeExecute('scroll')(args),
    }),

    hover: tool({
      description: 'Hover over an element to reveal tooltips or dropdown menus',
      parameters: z.object({
        selector: z.string().describe('Element to hover over'),
      }),
      execute: async (args) => makeExecute('hover')(args),
    }),

    select_option: tool({
      description: 'Select an option from a dropdown/select element',
      parameters: z.object({
        selector: z.string().describe('The select element'),
        value: z.string().describe('The option value or text to select'),
      }),
      execute: async (args) => makeExecute('select_option')(args),
    }),

    check: tool({
      description: 'Check a checkbox or radio button',
      parameters: z.object({
        selector: z.string().describe('The checkbox or radio to check'),
      }),
      execute: async (args) => makeExecute('check')(args),
    }),

    uncheck: tool({
      description: 'Uncheck a checkbox',
      parameters: z.object({
        selector: z.string().describe('The checkbox to uncheck'),
      }),
      execute: async (args) => makeExecute('uncheck')(args),
    }),

    go_back: tool({
      description: 'Go back in browser history',
      parameters: z.object({}),
      execute: async (args) => makeExecute('go_back')(args),
    }),

    go_forward: tool({
      description: 'Go forward in browser history',
      parameters: z.object({}),
      execute: async (args) => makeExecute('go_forward')(args),
    }),

    upload_file: tool({
      description: 'Upload a file to a file input element',
      parameters: z.object({
        selector: z.string().describe('The file input element'),
        filePath: z.string().describe('Path to the file to upload'),
      }),
      execute: async (args) => makeExecute('upload_file')(args),
    }),

    accept_dialog: tool({
      description: 'Accept a browser dialog (alert, confirm, prompt)',
      parameters: z.object({
        promptText: z
          .string()
          .optional()
          .describe('Text to enter in a prompt dialog'),
      }),
      execute: async (args) => makeExecute('accept_dialog')(args),
    }),

    dismiss_dialog: tool({
      description: 'Dismiss a browser dialog',
      parameters: z.object({}),
      execute: async (args) => makeExecute('dismiss_dialog')(args),
    }),

    get_text: tool({
      description: 'Read the text content of an element',
      parameters: z.object({
        selector: z.string().describe('Element to read text from'),
      }),
      execute: async (args) => makeExecute('get_text')(args),
    }),

    get_url: tool({
      description: 'Get the current page URL',
      parameters: z.object({}),
      execute: async (args) => makeExecute('get_url')(args),
    }),

    assert_visible: tool({
      description: 'Assert that specific text is visible on the page',
      parameters: z.object({
        text: z.string().describe('The text that should be visible'),
      }),
      execute: async (args) => makeExecute('assert_visible')(args),
    }),

    assert_url: tool({
      description: 'Assert the current URL matches a pattern',
      parameters: z.object({
        pattern: z
          .string()
          .describe('URL pattern (substring or regex) to match against'),
      }),
      execute: async (args) => makeExecute('assert_url')(args),
    }),

    assert_text_contains: tool({
      description: 'Assert an element contains specific text',
      parameters: z.object({
        selector: z.string().describe('Element to check'),
        text: z.string().describe('Text the element should contain'),
      }),
      execute: async (args) => makeExecute('assert_text_contains')(args),
    }),

    wait: tool({
      description: 'Wait for a specified time (max 5 seconds)',
      parameters: z.object({
        milliseconds: z
          .number()
          .describe('Time to wait in milliseconds (max 5000)'),
      }),
      execute: async (args) => makeExecute('wait')(args),
    }),

    wait_for_element: tool({
      description: 'Wait until an element reaches a specific state',
      parameters: z.object({
        selector: z.string().describe('Element to wait for'),
        state: z
          .enum(['visible', 'hidden', 'attached', 'detached'])
          .describe('Target state'),
      }),
      execute: async (args) => makeExecute('wait_for_element')(args),
    }),

    wait_for_network_idle: tool({
      description:
        'Wait until all network requests have finished. Useful after navigation or form submissions.',
      parameters: z.object({}),
      execute: async (args) => makeExecute('wait_for_network_idle')(args),
    }),

    drag_and_drop: tool({
      description: 'Drag an element and drop it onto another element',
      parameters: z.object({
        from: z.string().describe('Source element selector'),
        to: z.string().describe('Target element selector'),
      }),
      execute: async (args) => makeExecute('drag_and_drop')(args),
    }),

    screenshot: tool({
      description: 'Take a screenshot and save it to disk',
      parameters: z.object({}),
      execute: async () => {
        ctx.stepCount++;
        const state = await capturePageState(ctx.page);
        ctx.onPageStateUpdate(state);

        // Save screenshot to disk
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
      parameters: z.object({
        pass: z.boolean().describe('Whether the test passed'),
        reason: z
          .string()
          .describe('Explanation of why the test passed or failed'),
      }),
      // No execute — we handle this in the agent loop by checking tool calls
    }),
  };
}
