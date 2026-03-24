import type { SynthConfig } from './schema.js';

export const defaultConfig: SynthConfig = {
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
    dir: './synth-screenshots',
    onFailure: true,
    onSuccess: false,
  },

  reporter: 'console',
};
