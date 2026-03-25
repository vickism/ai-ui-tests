import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import { openai, createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { SynthConfig } from '../config/schema.js';
import { AIError } from '../utils/errors.js';

export function createModel(config: SynthConfig): LanguageModel {
  const { provider, model, apiKey } = config.ai;

  switch (provider) {
    case 'anthropic': {
      if (apiKey) {
        const custom = createAnthropic({ apiKey });
        return custom(model) as LanguageModel;
      }
      return anthropic(model) as LanguageModel;
    }

    case 'openai': {
      if (apiKey) {
        const custom = createOpenAI({ apiKey });
        return custom(model) as LanguageModel;
      }
      return openai(model) as LanguageModel;
    }

    default:
      throw new AIError(
        `Unsupported AI provider: "${provider}". Supported: anthropic, openai`
      );
  }
}
