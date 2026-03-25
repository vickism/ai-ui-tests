/**
 * Custom error hierarchy for AI UI Tests.
 *
 * All errors extend AiUiTestsError for consistent catch handling.
 *   - ConfigError: invalid or missing configuration
 *   - ParseError: malformed test files
 *   - BrowserError: Playwright launch/connection failures
 *   - ActionError: element not found or action failed (includes selector info)
 *   - AIError: LLM provider issues (missing API key, unsupported provider)
 */

/** Base error class for all AI UI Tests-specific errors. */
export class AiUiTestsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiUiTestsError'
  }
}

export class ConfigError extends AiUiTestsError {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export class ParseError extends AiUiTestsError {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}

export class BrowserError extends AiUiTestsError {
  constructor(message: string) {
    super(message)
    this.name = 'BrowserError'
  }
}

export class ActionError extends AiUiTestsError {
  constructor(
    message: string,
    public readonly action: string,
    public readonly selector?: string,
  ) {
    super(message)
    this.name = 'ActionError'
  }
}

export class AIError extends AiUiTestsError {
  constructor(message: string) {
    super(message)
    this.name = 'AIError'
  }
}
