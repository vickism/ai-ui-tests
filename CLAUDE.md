# Synth — AI-Driven UI Testing Tool

## What This Is

Synth is a CLI tool where UI tests are written in plain English (markdown files) and an AI agent drives a real browser via Playwright to verify them. The AI mimics what a real user would do — navigating, clicking, typing, and verifying outcomes.

## Architecture

```
User writes tests (.test.md) → Synth parses them → AI agent loop:
  1. Capture page state (screenshot + ARIA tree)
  2. Send to AI via Vercel AI SDK (generateText + stopWhen)
  3. AI returns tool call (click, type, navigate, assert, done)
  4. Execute action via Playwright
  5. Repeat until AI calls done(pass/fail) or step limit reached
```

The AI never directly touches the browser. Synth is the coordinator between the AI (brain) and Playwright (hands).

## Tech Stack

- **TypeScript** (ESM, target ES2022, NodeNext modules)
- **Playwright** ^1.58 — browser automation
- **Vercel AI SDK** (`ai` ^6.0, `@ai-sdk/anthropic` ^3.0, `@ai-sdk/openai` ^3.0) — multi-provider LLM integration
- **Commander.js** ^14 — CLI framework
- **Zod** ^3.25 — config and tool schema validation
- **tsup** — ESM build
- **Vitest** ^4.1 — unit tests

## Project Structure

```
src/
  index.ts              — Entry point, graceful shutdown (SIGINT/SIGTERM)
  cli/
    program.ts          — Commander setup (run, init, auth commands)
    commands/run.ts     — Main run command (wires config → parser → browser → AI → reporter)
    commands/init.ts    — Scaffolds config, example test, synth.md
    commands/auth.ts    — Manual login in headed browser, saves storageState
  config/
    schema.ts           — Zod config schema (SynthConfig type)
    defaults.ts         — Default config values
    loader.ts           — Loads synth.config.ts, merges with CLI overrides
    context.ts          — Reads synth.md + README.md for AI system prompt context
  parser/
    types.ts            — TestSuite, TestCase interfaces
    markdown-parser.ts  — Parses .test.md → headings=suites, bullets=tests
    index.ts            — File discovery (*.test.md, *.tests.md, *.synth.md recursive)
  browser/
    manager.ts          — Playwright lifecycle (launch, context with storageState, page, close)
    page-state.ts       — Screenshot (base64) + ARIA accessibility tree capture
    actions.ts          — 25 action executor + multi-strategy selector resolver
  ai/
    tools.ts            — 25 tool definitions using Zod schemas + inputSchema (Vercel AI SDK v6 `tool()`)
    prompt.ts           — System prompt builder (includes app context)
    provider.ts         — Creates LanguageModel from config (anthropic/openai via @ai-sdk providers)
  agent/
    loop.ts             — Core agent loop using generateText() with stopWhen: [stepCountIs(), hasToolCall('done')]
    context.ts          — Builds ModelMessage arrays with screenshots (mediaType) + ARIA trees
  runner/
    test-runner.ts      — Orchestrates single test (navigate to baseUrl → agent loop)
    suite-runner.ts     — Runs all suites, fresh page per test, grep filtering
  reporter/
    types.ts            — TestResult, SuiteResult, RunResult, Reporter interfaces
    console-reporter.ts — Colored PASS/FAIL terminal output
    screenshot-reporter.ts — Saves failure PNGs to disk
    index.ts            — Reporter factory
  utils/
    logger.ts           — Leveled logging (debug/info/warn/error) with colors
    errors.ts           — Custom error classes (SynthError, ConfigError, ParseError, BrowserError, ActionError, AIError)
templates/
  synth.config.ts       — Template config for `synth init`
  example.test.md       — Example test file
  synth.md              — Starter app context file
```

## Key Design Decisions

- **Tests are plain English in markdown** — no code, no YAML schemas. Headings = suites, bullets = tests.
- **App context via synth.md** — users describe their app so the AI understands pages, URLs, and terminology.
- **Vercel AI SDK v6** — unified provider interface. Swap between Anthropic/OpenAI via config. Uses `inputSchema` (not `parameters`), `ModelMessage` (not `CoreMessage`), `stopWhen` with `stepCountIs()`/`hasToolCall()` (not `maxSteps`), `mediaType` (not `mimeType`), tool call `input` (not `args`).
- **Multi-strategy selector resolution** — AI can say "Sign Up" or "#signup-btn" and the executor tries: CSS → text → role → label → placeholder → testId.
- **`done` tool has no execute function** — the agent loop checks for it in step results to determine pass/fail.
- **Fresh browser page per test** — isolation between tests.
- **Playwright auth passthrough** — `storageState` and `contextOptions` in config are passed directly to Playwright's browser context.

## Commands

```bash
npm run dev -- run tests/       # Run tests (dev mode via tsx)
npm run dev -- init             # Scaffold project files
npm run dev -- auth             # Open browser for manual login, save auth state
npm run build                   # Build with tsup → dist/index.js
npm test                        # Run unit tests with vitest
npm run lint                    # Type-check with tsc --noEmit
```

## Environment Variables

- `ANTHROPIC_API_KEY` — required when using Anthropic provider (default)
- `OPENAI_API_KEY` — required when using OpenAI provider

## Testing

87 unit tests across 12 test files covering:
- Markdown parser (headings, bullets, edge cases, file discovery, recursion)
- Config schema validation (defaults, overrides, invalid input)
- App context loader (synth.md, README.md loading, empty files, section headers)
- Logger (all levels, suppression by level)
- Custom error hierarchy (SynthError subclasses, ActionError properties)
- Console reporter (PASS/FAIL output, duration formatting, summary)
- AI tools (25 tool creation, execute functions, descriptions, done has no execute)
- AI provider factory (anthropic/openai model creation, invalid provider error)
- System prompt (content, app context injection)
- Browser actions (action executor with mocked pages, unknown actions, assertions)
