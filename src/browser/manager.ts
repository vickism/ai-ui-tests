import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
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
        channel: this.config.browser.channel,
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

    // Build context options: Synth defaults + Playwright passthrough
    const contextOptions: BrowserContextOptions = {
      viewport: this.config.browser.viewport,
      // Spread any Playwright context options from config (httpCredentials, extraHTTPHeaders, etc.)
      ...(this.config.browser.contextOptions as BrowserContextOptions | undefined),
    };

    // storageState is the primary Playwright auth mechanism
    if (this.config.browser.storageState) {
      contextOptions.storageState = this.config.browser.storageState;
      logger.debug(`Using auth state from: ${this.config.browser.storageState}`);
    }

    return this.browser.newContext(contextOptions);
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
