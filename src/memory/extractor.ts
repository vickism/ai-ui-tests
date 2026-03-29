import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import { logger } from '../utils/logger.js';
import type { StepDetail } from '../reporter/types.js';
import type { SelectorEntry, SelectorStrategy } from './types.js';

/** Tools that target page elements and use selectors. */
const ELEMENT_TARGETING_TOOLS = new Set([
  'click',
  'type',
  'hover',
  'select_option',
  'check',
  'uncheck',
  'get_text',
  'assert_visible',
  'assert_text_contains',
]);

interface ExtractedSelector {
  elementDescription: string;
  selector: string;
  strategy: SelectorStrategy;
  action: string;
  pageUrl: string;
}

const EXTRACTION_PROMPT = `You are a data extraction assistant. Analyze the following test step log and extract the selectors that were used successfully.

For each successful action that targeted a page element, extract:
- elementDescription: A short human-readable description of the element (e.g., "the login button", "email input field")
- selector: The exact selector string used (e.g., "Sign In", "#login-btn", "Email")
- strategy: How the selector resolves — one of: css, text, role, label, placeholder, testId
  - "css" if it looks like a CSS selector (starts with #, ., or contains brackets/combinators)
  - "text" if it's plain visible text (e.g., "Sign In", "Submit")
  - "role" if it references an ARIA role
  - "label" if it references a form label
  - "placeholder" if it references placeholder text
  - "testId" if it references a data-testid attribute
  - Default to "text" if unsure
- action: The tool name (click, type, hover, etc.)
- pageUrl: The URL pathname where the element was found (from the action result or context)

Return ONLY a raw JSON array (no markdown fences, no explanation). If no selectors were found, return an empty array [].

Example output:
[{"elementDescription":"login button","selector":"Sign In","strategy":"text","action":"click","pageUrl":"/login"},{"elementDescription":"email input","selector":"Email","strategy":"label","action":"type","pageUrl":"/login"}]`;

/**
 * Ask the AI to extract selector learnings from a test's step log.
 * Returns empty array on any failure — memory extraction must never break test runs.
 */
export async function extractSelectorMemory(
  model: LanguageModel,
  testName: string,
  stepDetails: StepDetail[],
  testPassed: boolean
): Promise<SelectorEntry[]> {
  // Filter to successful element-targeting actions
  const relevantSteps = stepDetails.filter(
    (step) =>
      step.action &&
      step.actionSuccess === true &&
      ELEMENT_TARGETING_TOOLS.has(step.action)
  );

  if (relevantSteps.length === 0) {
    logger.debug(`No element-targeting actions to extract from test: "${testName}"`);
    return [];
  }

  // Build a compact step log for the AI
  const stepLog = relevantSteps
    .map((step) => {
      const args = step.actionArgs
        ? Object.entries(step.actionArgs)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(', ')
        : '';
      return `✓ ${step.action}(${args}) → ${step.actionResult ?? 'success'}`;
    })
    .join('\n');

  try {
    const result = await generateText({
      model,
      system: EXTRACTION_PROMPT,
      prompt: `Test: "${testName}"\n\nStep log:\n${stepLog}`,
    });

    const text = result.text.trim();
    const parsed = JSON.parse(text) as ExtractedSelector[];

    if (!Array.isArray(parsed)) {
      logger.debug('Extractor returned non-array, ignoring');
      return [];
    }

    const now = new Date().toISOString();
    const baseConfidence = testPassed ? 0.5 : 0.3;

    return parsed
      .filter(
        (item) =>
          item.elementDescription &&
          item.selector &&
          item.strategy &&
          item.action &&
          item.pageUrl
      )
      .map((item) => ({
        elementDescription: item.elementDescription,
        selector: item.selector,
        strategy: item.strategy,
        action: item.action,
        pageUrl: item.pageUrl,
        confidence: baseConfidence,
        lastUsed: now,
        useCount: 1,
      }));
  } catch (err) {
    logger.debug(
      `Memory extraction failed for "${testName}": ${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  }
}
