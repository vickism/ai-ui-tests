import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { configSchema, type SynthConfig } from './schema.js';
import { defaultConfig } from './defaults.js';
import { ConfigError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const CONFIG_FILENAMES = [
  'synth.config.ts',
  'synth.config.js',
  'synth.config.mjs',
];

export interface CLIOverrides {
  baseUrl?: string;
  headed?: boolean;
  timeout?: number;
  screenshotDir?: string;
  model?: string;
  noMemory?: boolean;
}

export async function loadConfig(
  cwd: string = process.cwd(),
  overrides: CLIOverrides = {}
): Promise<SynthConfig> {
  let fileConfig: Record<string, unknown> = {};

  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.resolve(cwd, filename);
    if (fs.existsSync(configPath)) {
      logger.debug(`Loading config from ${configPath}`);
      try {
        const url = pathToFileURL(configPath).href;
        const mod = await import(url);
        fileConfig = mod.default ?? mod;
      } catch (err) {
        throw new ConfigError(
          `Failed to load config from ${filename}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      break;
    }
  }

  const merged = deepMerge(defaultConfig, fileConfig);

  if (overrides.baseUrl) {
    merged.baseUrl = overrides.baseUrl;
  }
  if (overrides.headed !== undefined) {
    merged.browser = merged.browser ?? {};
    (merged.browser as Record<string, unknown>).headless = !overrides.headed;
  }
  if (overrides.timeout !== undefined) {
    merged.browser = merged.browser ?? {};
    (merged.browser as Record<string, unknown>).timeout = overrides.timeout;
  }
  if (overrides.screenshotDir) {
    merged.screenshots = merged.screenshots ?? {};
    (merged.screenshots as Record<string, unknown>).dir = overrides.screenshotDir;
  }
  if (overrides.model) {
    merged.ai = merged.ai ?? {};
    (merged.ai as Record<string, unknown>).model = overrides.model;
  }
  if (overrides.noMemory) {
    merged.memory = merged.memory ?? {};
    (merged.memory as Record<string, unknown>).enabled = false;
  }

  const result = configSchema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new ConfigError(`Invalid configuration:\n${issues}`);
  }

  return result.data;
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
