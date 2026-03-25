import { Command } from 'commander';
import { chromium } from 'playwright';
import { loadConfig } from '../../config/loader.js';
import { logger } from '../../utils/logger.js';

const DEFAULT_AUTH_FILE = 'synth-auth.json';

export const authCommand = new Command('auth')
  .description(
    'Log in manually and save browser auth state for test reuse'
  )
  .option(
    '-o, --output <path>',
    'path to save auth state',
    DEFAULT_AUTH_FILE
  )
  .action(async (options: { output: string }) => {
    const outputPath = options.output;

    let config;
    try {
      config = await loadConfig(process.cwd());
    } catch {
      // Fallback if no config exists yet
      config = { baseUrl: 'http://localhost:3000' };
    }

    logger.info('Opening browser for manual login...');
    logger.info(`Navigate to: ${config.baseUrl}`);
    logger.info('Log in, then close the browser window when done.');
    logger.blank();

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(config.baseUrl);

    // Wait for the user to close the browser
    await new Promise<void>((resolve) => {
      page.on('close', () => resolve());
      context.on('close', () => resolve());
      browser.on('disconnected', () => resolve());
    });

    try {
      // Save storage state before fully closing
      await context.storageState({ path: outputPath });
      logger.success(`Auth state saved to: ${outputPath}`);
      logger.blank();
      logger.info('Add this to your synth.config.ts:');
      logger.info(`  browser: { storageState: '${outputPath}' }`);
    } catch {
      logger.warn(
        'Could not save auth state (browser may have closed too quickly).'
      );
      logger.info('Try again and close only the tab, not the entire browser.');
    }

    await browser.close().catch(() => {});
  });
