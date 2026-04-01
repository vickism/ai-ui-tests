/**
 * Builds the message payloads sent to the AI at each step of the agent loop.
 *
 * Each message includes a text block (test goal + page URL/title + ARIA tree)
 * and an image block (base64 PNG screenshot). The AI uses both to understand
 * the current page state and decide its next action.
 */

import type { ModelMessage } from 'ai';
import type { PageState } from '../browser/page-state.js';

export function buildInitialMessage(
  testGoal: string,
  pageState: PageState
): ModelMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'text',
        text: `## Test Goal\n\n${testGoal}\n\n## Current Page\n\nURL: ${pageState.url}\nTitle: ${pageState.title}\n\n## Accessibility Tree\n\n${pageState.ariaSnapshot}`,
      },
      {
        type: 'image',
        image: pageState.screenshot,
        mediaType: 'image/png',
      },
    ],
  };
}

export function buildStateUpdateMessage(pageState: PageState): ModelMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'text',
        text: `## Updated Page State\n\nURL: ${pageState.url}\nTitle: ${pageState.title}\n\n## Accessibility Tree\n\n${pageState.ariaSnapshot}`,
      },
      {
        type: 'image',
        image: pageState.screenshot,
        mediaType: 'image/png',
      },
    ],
  };
}
