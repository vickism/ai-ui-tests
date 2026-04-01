/**
 * Memory types for the selector learning system.
 *
 * Synth remembers which selectors worked in previous test runs and
 * injects them into the AI's system prompt on subsequent runs. This
 * reduces trial-and-error element resolution and improves test speed
 * and reliability over time.
 */

/** How Playwright resolved the selector — maps to the multi-strategy resolver in browser/actions.ts. */
export type SelectorStrategy = 'css' | 'text' | 'role' | 'label' | 'placeholder' | 'testId';

/**
 * A single remembered selector from a previous test run.
 *
 * Identity is the tuple (elementDescription, pageUrl, action) — two entries
 * with the same identity are considered the "same" element and get merged
 * rather than duplicated.
 */
export interface SelectorEntry {
  /** Human-readable description, e.g. "the login button", "email input field" */
  elementDescription: string;
  /** The actual selector string, e.g. "Sign In", "#login-btn", "Email" */
  selector: string;
  /** Which Playwright strategy resolved this selector */
  strategy: SelectorStrategy;
  /** The tool that used this selector, e.g. "click", "type", "hover" */
  action: string;
  /** URL pathname where the element was found, e.g. "/login" */
  pageUrl: string;
  /** 0.0–1.0. Starts at 0.5 (pass) or 0.3 (fail). Bumped +0.1 on each reuse, capped at 1.0. */
  confidence: number;
  /** ISO timestamp of the last successful use */
  lastUsed: string;
  /** Number of times this selector was successfully used across runs */
  useCount: number;
}

/**
 * On-disk JSON format for a memory file.
 * Stored at synth-memory/{suite}/_suite.json or synth-memory/{suite}/{test}.json.
 */
export interface SelectorMemoryFile {
  version: 1;
  updatedAt: string;
  selectors: SelectorEntry[];
}

/** Config section controlling the memory system. */
export interface MemoryConfig {
  enabled: boolean;
  /** Directory path for memory files, e.g. "./synth-memory" */
  dir: string;
}
