import { generateText, stepCountIs, hasToolCall } from 'ai';
import type { LanguageModel } from 'ai';
import type { Page } from 'playwright';
import { createTools, type ToolContext } from '../ai/tools.js';
import { buildSystemPrompt } from '../ai/prompt.js';
import { buildInitialMessage } from './context.js';
import { capturePageState, type PageState } from '../browser/page-state.js';
import { logger } from '../utils/logger.js';
import type { SynthConfig } from '../config/schema.js';

export interface AgentResult {
  pass: boolean;
  reason: string;
  steps: number;
  durationMs: number;
}

export interface AgentOptions {
  testGoal: string;
  page: Page;
  model: LanguageModel;
  config: SynthConfig;
  appContext: string;
}

export async function runAgentLoop(options: AgentOptions): Promise<AgentResult> {
  const { testGoal, page, model, config, appContext } = options;
  const startTime = Date.now();

  // Capture initial page state
  let latestState: PageState = await capturePageState(page);

  const toolCtx: ToolContext = {
    page,
    screenshotDir: config.screenshots.dir,
    testName: testGoal,
    stepCount: 0,
    onPageStateUpdate: (state: PageState) => {
      latestState = state;
    },
  };

  const tools = createTools(toolCtx);
  const systemPrompt = buildSystemPrompt(appContext);
  const initialMessage = buildInitialMessage(testGoal, latestState);

  logger.debug(`Starting agent loop for: "${testGoal}"`);

  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [initialMessage],
      tools,
      stopWhen: [
        stepCountIs(config.ai.maxIterations),
        hasToolCall('done'),
      ],
      onStepFinish: (step) => {
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const call of step.toolCalls) {
            logger.debug(`  Step ${toolCtx.stepCount}: ${call.toolName}`);
          }
        }
      },
    });

    // Check if the AI called the 'done' tool
    for (const step of result.steps) {
      for (const call of step.toolCalls) {
        if (call.toolName === 'done') {
          const input = call.input as { pass: boolean; reason: string };
          return {
            pass: input.pass,
            reason: input.reason,
            steps: toolCtx.stepCount,
            durationMs: Date.now() - startTime,
          };
        }
      }
    }

    // If we got here, the AI finished without calling done
    return {
      pass: false,
      reason: `AI completed ${config.ai.maxIterations} steps without reaching a verdict`,
      steps: toolCtx.stepCount,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Agent error: ${message}`);
    return {
      pass: false,
      reason: `Agent error: ${message}`,
      steps: toolCtx.stepCount,
      durationMs: Date.now() - startTime,
    };
  }
}
