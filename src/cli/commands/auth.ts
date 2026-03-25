/**
 * The `ai-ui-tests auth` command — opens a browser for manual login.
 *
 * Two modes based on config:
 *   - With userDataDir: launches a persistent Edge/Chrome profile. Login cookies
 *     are saved directly into the profile directory for reuse across runs.
 *   - Without userDataDir: launches a clean browser. On close, saves a
 *     storageState JSON file that can be referenced in config.
 *
 * Respects browser.channel (Edge, Chrome, etc.) and browser.browserType from config.
 */

import { Command } from 'commander'
import { chromium, firefox, webkit, type BrowserType } from 'playwright'
import { loadConfig } from '../../config/loader.js'
import { logger } from '../../utils/logger.js'

const DEFAULT_AUTH_FILE = 'ai-ui-tests-auth.json'

const BROWSER_TYPES: Record<string, BrowserType> = {
  chromium,
  firefox,
  webkit,
}

export const authCommand = new Command('auth')
  .description('Log in manually and save browser auth state for test reuse')
  .option('-o, --output <path>', 'path to save auth state', DEFAULT_AUTH_FILE)
  .action(async (options: { output: string }) => {
    const outputPath = options.output

    let config
    try {
      config = await loadConfig(process.cwd())
    } catch {
      config = {
        baseUrl: 'http://localhost:3000',
        browser: { browserType: 'chromium' as const },
      }
    }

    const browserType = BROWSER_TYPES[config.browser?.browserType ?? 'chromium'] ?? chromium
    const channel = config.browser?.channel
    const userDataDir = config.browser?.userDataDir

    logger.info('Opening browser for manual login...')
    logger.info(`Navigate to: ${config.baseUrl}`)
    logger.info('Log in, then close the browser window when done.')
    logger.blank()

    if (userDataDir) {
      // Persistent profile mode — session is saved directly into the profile.
      // No storageState JSON needed; cookies persist in the profile directory.
      logger.info(`Using persistent profile: ${userDataDir}`)
      logger.blank()

      const context = await browserType.launchPersistentContext(userDataDir, {
        headless: false,
        channel,
        viewport: config.browser?.viewport,
      })

      const page = context.pages()[0] ?? (await context.newPage())
      await page.goto(config.baseUrl)

      // Wait for the user to close the browser
      await new Promise<void>((resolve) => {
        page.on('close', () => resolve())
        context.on('close', () => resolve())
      })

      await context.close().catch(() => {})

      logger.success('Login saved to persistent profile.')
      logger.info('Your sessions and cookies are stored in:')
      logger.info(`  ${userDataDir}`)
      logger.blank()
      logger.info('Now run: npx ai-ui-tests run')
    } else {
      // Normal mode — save storageState to JSON file.
      const browser = await browserType.launch({
        headless: false,
        channel,
      })
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto(config.baseUrl)

      await new Promise<void>((resolve) => {
        page.on('close', () => resolve())
        context.on('close', () => resolve())
        browser.on('disconnected', () => resolve())
      })

      try {
        await context.storageState({ path: outputPath })
        logger.success(`Auth state saved to: ${outputPath}`)
        logger.blank()
        logger.info('Add this to your ai-ui-tests.config.ts:')
        logger.info(`  browser: { storageState: '${outputPath}' }`)
      } catch {
        logger.warn('Could not save auth state (browser may have closed too quickly).')
        logger.info('Try again and close only the tab, not the entire browser.')
      }

      await browser.close().catch(() => {})
    }
  })
