import { describe, it, expect } from 'vitest';
import {
  SynthError,
  ConfigError,
  ParseError,
  BrowserError,
  ActionError,
  AIError,
} from '../../../src/utils/errors.js';

describe('custom errors', () => {
  it('SynthError has correct name and message', () => {
    const err = new SynthError('test message');
    expect(err.name).toBe('SynthError');
    expect(err.message).toBe('test message');
    expect(err).toBeInstanceOf(Error);
  });

  it('ConfigError extends SynthError', () => {
    const err = new ConfigError('bad config');
    expect(err.name).toBe('ConfigError');
    expect(err).toBeInstanceOf(SynthError);
    expect(err).toBeInstanceOf(Error);
  });

  it('ParseError extends SynthError', () => {
    const err = new ParseError('bad parse');
    expect(err.name).toBe('ParseError');
    expect(err).toBeInstanceOf(SynthError);
  });

  it('BrowserError extends SynthError', () => {
    const err = new BrowserError('browser fail');
    expect(err.name).toBe('BrowserError');
    expect(err).toBeInstanceOf(SynthError);
  });

  it('ActionError stores action and selector', () => {
    const err = new ActionError('not found', 'click', '#btn');
    expect(err.name).toBe('ActionError');
    expect(err.action).toBe('click');
    expect(err.selector).toBe('#btn');
    expect(err).toBeInstanceOf(SynthError);
  });

  it('ActionError works without selector', () => {
    const err = new ActionError('failed', 'navigate');
    expect(err.selector).toBeUndefined();
  });

  it('AIError extends SynthError', () => {
    const err = new AIError('ai fail');
    expect(err.name).toBe('AIError');
    expect(err).toBeInstanceOf(SynthError);
  });
});
