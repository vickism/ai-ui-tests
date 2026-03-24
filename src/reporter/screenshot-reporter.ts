import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
import { logger } from '../utils/logger.js';

export async function saveFailureScreenshot(
  page: Page,
  testName: string,
  screenshotDir: string
): Promise<string | undefined> {
  try {
    const sanitizedName = testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const dir = path.join(screenshotDir, sanitizedName);
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, 'failure.png');
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    fs.writeFileSync(filePath, buffer);

    logger.debug(`Failure screenshot saved: ${filePath}`);
    return filePath;
  } catch (err) {
    logger.debug(`Failed to save screenshot: ${err}`);
    return undefined;
  }
}
