import { z } from 'zod';

export const configSchema = z.object({
  baseUrl: z.string().url(),

  ai: z
    .object({
      provider: z
        .enum(['anthropic', 'openai', 'azure', 'google', 'mistral'])
        .default('anthropic'),
      model: z.string().default('claude-sonnet-4-20250514'),
      apiKey: z.string().optional(),
      baseURL: z.string().optional(),
      maxIterations: z.number().int().min(1).max(100).default(30),
    })
    .default(() => ({
      provider: 'anthropic' as const,
      model: 'claude-sonnet-4-20250514',
      maxIterations: 30,
    })),

  browser: z
    .object({
      headless: z.boolean().default(true),
      viewport: z
        .object({
          width: z.number().int().default(1280),
          height: z.number().int().default(720),
        })
        .default(() => ({ width: 1280, height: 720 })),
      timeout: z.number().int().default(30000),
      browserType: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
      storageState: z.string().optional(),
      contextOptions: z.record(z.string(), z.unknown()).optional(),
    })
    .default(() => ({
      headless: true,
      viewport: { width: 1280, height: 720 },
      timeout: 30000,
      browserType: 'chromium' as const,
    })),

  screenshots: z
    .object({
      dir: z.string().default('./synth-screenshots'),
      onFailure: z.boolean().default(true),
      onSuccess: z.boolean().default(false),
    })
    .default(() => ({
      dir: './synth-screenshots',
      onFailure: true,
      onSuccess: false,
    })),

  reporter: z.enum(['console', 'html', 'json']).default('console'),
});

export type SynthConfig = z.infer<typeof configSchema>;
