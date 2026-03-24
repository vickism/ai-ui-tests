import type { CoreMessage } from 'ai';
import type { PageState } from '../browser/page-state.js';

export function buildInitialMessage(
  testGoal: string,
  pageState: PageState
): CoreMessage {
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
        mimeType: 'image/png',
      },
    ],
  };
}

export function buildStateUpdateMessage(pageState: PageState): CoreMessage {
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
        mimeType: 'image/png',
      },
    ],
  };
}
