/**
 * Manages the Playwright browser lifecycle.
 *
 * Supports two modes:
 *   - Normal: launches a clean browser instance per run (browser.launch)
 *   - Persistent: uses a real user profile directory (launchPersistentContext)
 *     for reusing cookies, logins, and extensions across runs
 *
 * The persistent mode is triggered by setting browser.userDataDir in config.
 * When persistent, callers must only close pages (not the context) between tests.
 */

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
  private persistentContext: BrowserContext | null = null;
  private config: SynthConfig;

  constructor(config: SynthConfig) {
    this.config = config;
  }

  /** Whether this manager uses a persistent user profile. */
  get isPersistent(): boolean {
    return !!this.config.browser.userDataDir;
  }

  async launch(): Promise<void> {
    const browserType =
      BROWSER_TYPES[this.config.browser.browserType] ?? chromium;

    const { headless, channel, userDataDir } = this.config.browser;

    try {
      if (userDataDir) {
        // Persistent context — uses the real user profile (cookies, logins, extensions).
        // launchPersistentContext returns a BrowserContext, not a Browser.
        logger.debug(
          `Launching persistent ${this.config.browser.browserType} from ${userDataDir}` +
            (channel ? ` (channel: ${channel})` : '')
        );

        this.persistentContext = await browserType.launchPersistentContext(
          userDataDir,
          {
            headless,
            channel,
            viewport: this.config.browser.viewport,
            ...(this.config.browser.contextOptions as BrowserContextOptions | undefined),
          }
        );
      } else {
        // Normal launch — clean profile each run.
        logger.debug(
          `Launching ${this.config.browser.browserType} (headless: ${headless})`
        );

        this.browser = await browserType.launch({ headless, channel });
      }
    } catch (err) {
      throw new BrowserError(
        `Failed to launch browser: ${err instanceof Error ? err.message : String(err)}. ` +
          'Run "npx playwright install" to install browser binaries.'
      );
    }
  }

  async newContext(): Promise<BrowserContext> {
    if (this.persistentContext) {
      // Persistent mode — return the single shared context.
      // Callers must NOT close this context; only close individual pages.
      return this.persistentContext;
    }

    if (!this.browser) {
      throw new BrowserError('Browser not launched. Call launch() first.');
    }

    // Build context options: Synth defaults + Playwright passthrough
    const contextOptions: BrowserContextOptions = {
      viewport: this.config.browser.viewport,
      ...(this.config.browser.contextOptions as BrowserContextOptions | undefined),
    };

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
    if (this.persistentContext) {
      await this.persistentContext.close();
      this.persistentContext = null;
      logger.debug('Persistent browser closed');
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.debug('Browser closed');
    }
  }
}
