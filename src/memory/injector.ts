import type { SelectorEntry } from './types.js';

const MAX_ENTRIES = 50;

/**
 * Build a system prompt section with remembered selector data.
 * Returns empty string if no entries.
 */
export function buildMemoryPromptSection(entries: SelectorEntry[]): string {
  if (!entries || entries.length === 0) {
    return '';
  }

  // Sort by confidence descending, cap at MAX_ENTRIES
  const sorted = [...entries]
    .sort((a, b) => b.confidence - a.confidence || b.useCount - a.useCount)
    .slice(0, MAX_ENTRIES);

  const rows = sorted
    .map((entry) => {
      const pct = `${Math.round(entry.confidence * 100)}%`;
      return `| ${entry.elementDescription} | ${entry.selector} | ${entry.strategy} | ${entry.pageUrl} | ${pct} |`;
    })
    .join('\n');

  return `
## Remembered Selectors

From previous test runs, these selectors worked reliably. Prefer them when targeting the corresponding elements, but fall back to your normal approach if they don't match the current page.

| Element | Selector | Strategy | Page | Confidence |
|---------|----------|----------|------|------------|
${rows}`;
}
