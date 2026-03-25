/**
 * Saves failure screenshots to disk as PNG files.
 *
 * When a test fails and config.screenshots.onFailure is true, captures
 * the final browser state and saves it to:
 *   ai-ui-tests-screenshots/{sanitized-test-name}/failure.png
 */

import fs from 'node:fs'
import path from 'node:path'
import type { Page } from 'playwright'
import { logger } from '../utils/logger.js'
import { sanitizeName } from '../utils/sanitize.js'

export async function saveFailureScreenshot(page: Page, testName: string, screenshotDir: string): Promise<string | undefined> {
  try {
    const sanitizedName = sanitizeName(testName)

    const dir = path.join(screenshotDir, sanitizedName)
    fs.mkdirSync(dir, { recursive: true })

    const filePath = path.join(dir, 'failure.png')
    const buffer = await page.screenshot({ type: 'png', fullPage: false })
    fs.writeFileSync(filePath, buffer)

    logger.debug(`Failure screenshot saved: ${filePath}`)
    return filePath
  } catch (err) {
    logger.debug(`Failed to save screenshot: ${err}`)
    return undefined
  }
}
