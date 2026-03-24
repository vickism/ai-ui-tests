import type { Page } from 'playwright';
import { logger } from '../utils/logger.js';

export interface PageState {
  screenshot: string;
  ariaSnapshot: string;
  url: string;
  title: string;
}

export async function captureScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({ type: 'png', fullPage: false });
  return buffer.toString('base64');
}

export async function captureAriaSnapshot(page: Page): Promise<string> {
  try {
    const snapshot = await page.locator('body').ariaSnapshot();
    return snapshot;
  } catch (err) {
    logger.debug(
      `ARIA snapshot failed, falling back to text content: ${err instanceof Error ? err.message : String(err)}`
    );
    return await page.innerText('body').catch(() => '(empty page)');
  }
}

export async function capturePageState(page: Page): Promise<PageState> {
  const [screenshot, ariaSnapshot, url, title] = await Promise.all([
    captureScreenshot(page),
    captureAriaSnapshot(page),
    Promise.resolve(page.url()),
    page.title(),
  ]);

  return { screenshot, ariaSnapshot, url, title };
}
