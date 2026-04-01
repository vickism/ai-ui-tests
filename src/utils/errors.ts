/**
 * Custom error hierarchy for Synth.
 *
 * All errors extend SynthError for consistent catch handling.
 *   - ConfigError: invalid or missing configuration
 *   - ParseError: malformed test files
 *   - BrowserError: Playwright launch/connection failures
 *   - ActionError: element not found or action failed (includes selector info)
 *   - AIError: LLM provider issues (missing API key, unsupported provider)
 */

/** Base error class for all Synth-specific errors. */
export class SynthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SynthError';
  }
}

export class ConfigError extends SynthError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ParseError extends SynthError {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export class BrowserError extends SynthError {
  constructor(message: string) {
    super(message);
    this.name = 'BrowserError';
  }
}

export class ActionError extends SynthError {
  constructor(
    message: string,
    public readonly action: string,
    public readonly selector?: string
  ) {
    super(message);
    this.name = 'ActionError';
  }
}

export class AIError extends SynthError {
  constructor(message: string) {
    super(message);
    this.name = 'AIError';
  }
}
