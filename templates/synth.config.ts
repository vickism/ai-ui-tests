export default {
  baseUrl: 'http://localhost:3000',

  ai: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    maxIterations: 30,
  },

  browser: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },

  screenshots: {
    dir: './synth-screenshots',
    onFailure: true,
    onSuccess: false,
  },
};
