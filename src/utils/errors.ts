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
