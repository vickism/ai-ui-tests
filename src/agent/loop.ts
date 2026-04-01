/**
 * Core agent loop — the heart of Synth.
 *
 * For each test, this module:
 *   1. Captures the initial page state (screenshot + ARIA tree)
 *   2. Calls generateText() with the system prompt, tools, and page state
 *   3. The AI decides an action (click, type, navigate, assert, done)
 *   4. Synth executes the action via Playwright
 *   5. Captures the new page state and feeds it back to the AI
 *   6. Repeats until the AI calls `done(pass/fail)` or the step limit is reached
 *
 * Uses Vercel AI SDK's stopWhen with stepCountIs() and hasToolCall('done')
 * to control loop termination. The onStepFinish callback captures AI reasoning
 * and tool call details for verbose reporting.
 */

import { generateText, stepCountIs, hasToolCall } from 'ai';
import type { LanguageModel } from 'ai';
import type { Page } from 'playwright';
import { createTools, type ToolContext } from '../ai/tools.js';
import { buildSystemPrompt } from '../ai/prompt.js';
import { buildInitialMessage } from './context.js';
import { capturePageState, type PageState } from '../browser/page-state.js';
import { logger } from '../utils/logger.js';
import type { SynthConfig } from '../config/schema.js';
import type { StepDetail } from '../reporter/types.js';
import type { SelectorEntry } from '../memory/types.js';

export interface AgentResult {
  pass: boolean;
  reason: string;
  steps: number;
  durationMs: number;
  stepDetails: StepDetail[];
}

export interface AgentOptions {
  testGoal: string;
  page: Page;
  model: LanguageModel;
  config: SynthConfig;
  appContext: string;
  selectorMemory?: SelectorEntry[];
  onStepUpdate?: (detail: StepDetail) => void;
}

export async function runAgentLoop(options: AgentOptions): Promise<AgentResult> {
  const { testGoal, page, model, config, appContext, onStepUpdate } = options;
  const startTime = Date.now();
  const stepDetails: StepDetail[] = [];

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
  const systemPrompt = buildSystemPrompt(appContext, options.selectorMemory);
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
        // Capture AI reasoning (text between tool calls)
        const reasoning = (step.text || '').trim();

        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const call of step.toolCalls) {
            const detail: StepDetail = {
              stepNumber: toolCtx.stepCount,
              reasoning: reasoning || undefined,
              action: call.toolName,
              actionArgs: call.input as Record<string, unknown>,
            };

            // Find matching tool result
            if (step.toolResults) {
              for (const tr of step.toolResults) {
                if (tr.toolCallId === call.toolCallId) {
                  const res = tr.output as { success?: boolean; message?: string } | undefined;
                  detail.actionResult = res?.message;
                  detail.actionSuccess = res?.success;
                }
              }
            }

            stepDetails.push(detail);
            onStepUpdate?.(detail);
          }
        } else if (reasoning) {
          // Pure reasoning step with no tool call
          const detail: StepDetail = {
            stepNumber: toolCtx.stepCount,
            reasoning,
          };
          stepDetails.push(detail);
          onStepUpdate?.(detail);
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
            stepDetails,
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
      stepDetails,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Agent error: ${message}`);
    return {
      pass: false,
      reason: `Agent error: ${message}`,
      steps: toolCtx.stepCount,
      durationMs: Date.now() - startTime,
      stepDetails,
    };
  }
}
