import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { SynthConfig } from '../config/schema.js';
import { AIError } from '../utils/errors.js';

export function createModel(config: SynthConfig): LanguageModel {
  const { provider, model, apiKey } = config.ai;

  switch (provider) {
    case 'anthropic': {
      if (apiKey) {
        const { createAnthropic } = require('@ai-sdk/anthropic');
        return createAnthropic({ apiKey })(model);
      }
      return anthropic(model);
    }

    case 'openai': {
      if (apiKey) {
        const { createOpenAI } = require('@ai-sdk/openai');
        return createOpenAI({ apiKey })(model);
      }
      return openai(model);
    }

    default:
      throw new AIError(
        `Unsupported AI provider: "${provider}". Supported: anthropic, openai`
      );
  }
}
