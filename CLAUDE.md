# AI UI Tests — AI-Driven UI Testing Tool

## What This Is

AI UI Tests is a CLI tool where UI tests are written in plain English (markdown files) and an AI agent drives a real browser via Playwright to verify them. The AI mimics what a real user would do — navigating, clicking, typing, and verifying outcomes.

## Architecture

```
User writes tests (.test.md) → AI UI Tests parses them → AI agent loop:
  1. Capture page state (screenshot + ARIA tree)
  2. Send to AI via Vercel AI SDK (generateText + stopWhen)
  3. AI returns tool call (click, type, navigate, assert, done)
  4. Execute action via Playwright
  5. Repeat until AI calls done(pass/fail) or step limit reached
```

The AI never directly touches the browser. AI UI Tests is the coordinator between the AI (brain) and Playwright (hands).

## Tech Stack

- **TypeScript** (ESM, target ES2022, NodeNext modules)
- **Playwright** — browser automation
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/azure`) — multi-provider LLM integration
- **Commander.js** — CLI framework
- **Zod** — config and tool schema validation
- **tsup** — ESM build
- **Vitest** — unit tests

## Project Structure

```
src/
  index.ts              — Entry point, graceful shutdown (SIGINT/SIGTERM)
  cli/
    program.ts          — Commander setup (run, init, auth commands)
    commands/run.ts     — Main run command (wires config → parser → browser → AI → reporter)
    commands/init.ts    — Scaffolds config, example test, ai-ui-tests.md
    commands/auth.ts    — Manual login in headed browser, saves storageState
  config/
    schema.ts           — Zod config schema (AiUiTestsConfig type)
    loader.ts           — Loads ai-ui-tests.config.ts, merges with CLI overrides
    context.ts          — Reads ai-ui-tests.md + README.md for AI system prompt context
  parser/
    markdown-parser.ts  — Parses .test.md → headings=suites, bullets=tests
    index.ts            — File discovery (*.test.md, *.tests.md, *.ai-ui-tests.md recursive)
  browser/
    manager.ts          — Playwright lifecycle (launch, context with storageState, page, close)
    page-state.ts       — Screenshot (base64) + ARIA accessibility tree capture
    actions.ts          — Action executor + multi-strategy selector resolver
  ai/
    tools.ts            — 26 tool definitions using Zod schemas + inputSchema (Vercel AI SDK v6 `tool()`)
    prompt.ts           — System prompt builder (includes app context)
    provider.ts         — Creates LanguageModel from config (anthropic/openai via @ai-sdk providers)
  agent/
    loop.ts             — Core agent loop using generateText() with stopWhen: [stepCountIs(), hasToolCall('done')]
    context.ts          — Builds ModelMessage arrays with screenshots (mediaType) + ARIA trees
  runner/
    test-runner.ts      — Orchestrates single test (navigate to baseUrl → agent loop)
    suite-runner.ts     — Runs all suites, fresh page per test, grep filtering
  reporter/
    console-reporter.ts — Colored PASS/FAIL terminal output
    screenshot-reporter.ts — Saves failure PNGs to disk
    index.ts            — Reporter factory
  memory/
    store.ts            — Load, save, merge, prune memory files (filesystem I/O)
    extractor.ts        — Post-test LLM call to extract selector learnings from step log
    injector.ts         — Format memory entries into system prompt markdown section
    index.ts            — Public API: loadMemoryForTest, saveMemoryAfterTest
  test-data/
    session.ts          — Fake test data generation using @faker-js/faker (generate_test_data tool)
  utils/
    logger.ts           — Leveled logging (debug/info/warn/error) with colors
    errors.ts           — Custom error classes (AiUiTestsError, ConfigError, ParseError, BrowserError, ActionError, AIError)
```

## Key Design Decisions

- **Tests are plain English in markdown** — no code, no YAML schemas. Headings = suites, bullets = tests.
- **App context via ai-ui-tests.md** — users describe their app so the AI understands pages, URLs, and terminology.
- **Vercel AI SDK v6** — unified provider interface. Swap between Anthropic/OpenAI via config. Uses `inputSchema` (not `parameters`), `ModelMessage` (not `CoreMessage`), `stopWhen` with `stepCountIs()`/`hasToolCall()` (not `maxSteps`), `mediaType` (not `mimeType`), tool call `input` (not `args`).
- **Multi-strategy selector resolution** — AI can say "Sign Up" or "#signup-btn" and the executor tries: CSS → text → role → label → placeholder → testId.
- **`generate_test_data` tool** — AI can request realistic fake data (names, emails, addresses, etc.) via `@faker-js/faker` for filling forms uniquely each run.
- **`done` tool has no execute function** — the agent loop checks for it in step results to determine pass/fail.
- **Fresh browser page per test** — isolation between tests.
- **Playwright auth passthrough** — `storageState` and `contextOptions` in config are passed directly to Playwright's browser context.
- **Selector memory** — After each test, AI extracts which selectors worked and saves to `ai-ui-tests-memory/` directory. On subsequent runs, remembered selectors are injected into the system prompt. Memory is advisory (AI can ignore stale entries), additive (confidence grows with reuse), and fault-tolerant (corrupted files silently reset). Disable with `--no-memory` flag or `memory.enabled: false` in config.

## Commands

```bash
npm run dev -- run tests/       # Run tests (dev mode via tsx)
npm run dev -- init             # Scaffold project files
npm run dev -- auth             # Open browser for manual login, save auth state
npm run build                   # Build with tsup → dist/index.js
npm test                        # Run unit tests with vitest
npm run lint                    # Lint with ESLint
npm run check-types             # Type-check with tsc --noEmit
```

## Environment Variables

- `ANTHROPIC_API_KEY` — required when using Anthropic provider (default)
- `OPENAI_API_KEY` — required when using OpenAI provider
