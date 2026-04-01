/**
 * Zod schema defining the shape and defaults of synth.config.ts.
 *
 * All fields except baseUrl have sensible defaults. The schema validates
 * config loaded from the user's file, merged with defaults and CLI overrides.
 *
 * Sections:
 *   - ai: provider, model, API key, max iterations
 *   - browser: headless, viewport, channel (Edge/Chrome), userDataDir, storageState
 *   - screenshots: output directory, capture on failure/success
 *   - memory: enable/disable selector learning, storage directory
 *   - reporter: output format (console/html/json)
 */

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
      resourceName: z.string().optional(),
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
      channel: z.string().optional(),
      userDataDir: z.string().optional(),
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

  memory: z
    .object({
      enabled: z.boolean().default(true),
      dir: z.string().default('./synth-memory'),
    })
    .default(() => ({
      enabled: true,
      dir: './synth-memory',
    })),

  reporter: z.enum(['console', 'html', 'json']).default('console'),
});

export type SynthConfig = z.infer<typeof configSchema>;
