import type { AiUiTestsConfig } from './schema.js'

export const defaultConfig: AiUiTestsConfig = {
  baseUrl: 'http://localhost:3000',

  ai: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    maxIterations: 30,
  },

  browser: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    timeout: 30000,
    browserType: 'chromium',
  },

  screenshots: {
    dir: './ai-ui-tests-screenshots',
    onFailure: true,
    onSuccess: false,
  },

  memory: {
    enabled: true,
    dir: './ai-ui-tests-memory',
  },

  reporter: 'console',
}
