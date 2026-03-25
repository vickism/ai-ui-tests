import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, setLogLevel } from '../../../src/utils/logger.js';

describe('logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setLogLevel('debug'); // enable all levels
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setLogLevel('info'); // reset
  });

  it('logs debug messages when level is debug', () => {
    logger.debug('test debug');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs info messages', () => {
    logger.info('test info');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs success messages', () => {
    logger.success('test success');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs warnings', () => {
    logger.warn('test warn');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('logs errors', () => {
    logger.error('test error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('suppresses debug when level is info', () => {
    setLogLevel('info');
    logger.debug('should not appear');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('suppresses info when level is warn', () => {
    setLogLevel('warn');
    logger.info('should not appear');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('suppresses warn when level is error', () => {
    setLogLevel('error');
    logger.warn('should not appear');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('blank outputs an empty line', () => {
    logger.blank();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
