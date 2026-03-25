/**
 * Builds the message payloads sent to the AI at each step of the agent loop.
 *
 * Each message includes a text block (test goal + page URL/title + ARIA tree + form signals)
 * and an image block (base64 PNG screenshot). The AI uses both to understand
 * the current page state and decide its next action.
 */

import type { ModelMessage } from 'ai'
import { formatPageStateForModel, type PageState } from '../browser/page-state.js'

export function buildInitialMessage(testGoal: string, pageState: PageState): ModelMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'text',
        text: `## Test Goal\n\n${testGoal}\n\n${formatPageStateForModel(pageState, 'Current Page')}`,
      },
      {
        type: 'image',
        image: pageState.screenshot,
        mediaType: 'image/png',
      },
    ],
  }
}

export function buildStateUpdateMessage(pageState: PageState): ModelMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'text',
        text: formatPageStateForModel(pageState, 'Updated Page State'),
      },
      {
        type: 'image',
        image: pageState.screenshot,
        mediaType: 'image/png',
      },
    ],
  }
}
