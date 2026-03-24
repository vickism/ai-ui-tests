import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type Page,
  type BrowserType,
} from 'playwright';
import type { SynthConfig } from '../config/schema.js';
import { BrowserError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const BROWSER_TYPES: Record<string, BrowserType> = {
  chromium,
  firefox,
  webkit,
};

export class BrowserManager {
  private browser: Browser | null = null;
  private config: SynthConfig;

  constructor(config: SynthConfig) {
    this.config = config;
  }

  async launch(): Promise<void> {
    const browserType =
      BROWSER_TYPES[this.config.browser.browserType] ?? chromium;

    logger.debug(
      `Launching ${this.config.browser.browserType} (headless: ${this.config.browser.headless})`
    );

    try {
      this.browser = await browserType.launch({
        headless: this.config.browser.headless,
      });
    } catch (err) {
      throw new BrowserError(
        `Failed to launch browser: ${err instanceof Error ? err.message : String(err)}. ` +
          'Run "npx playwright install" to install browser binaries.'
      );
    }
  }

  async newContext(): Promise<BrowserContext> {
    if (!this.browser) {
      throw new BrowserError('Browser not launched. Call launch() first.');
    }

    return this.browser.newContext({
      viewport: this.config.browser.viewport,
    });
  }

  async newPage(): Promise<Page> {
    const context = await this.newContext();
    return context.newPage();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.debug('Browser closed');
    }
  }
}
