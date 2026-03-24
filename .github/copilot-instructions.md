# Synth — AI-Driven UI Testing Tool

## What This Is

CLI tool for AI-driven UI testing. Tests written in plain English markdown, executed by an AI agent controlling a real browser via Playwright.

## Architecture

Tests (.test.md) are parsed into suites/cases. For each test, an agent loop sends the test goal + page state (screenshot + ARIA tree) to an LLM via Vercel AI SDK. The AI responds with tool calls (click, type, navigate, assert, done) that Synth executes via Playwright. Loop repeats until the AI calls `done(pass/fail)`.

## Tech Stack

TypeScript (ESM), Playwright, Vercel AI SDK (`ai`), Commander.js, Zod, tsup, Vitest.

## Key Files

- `src/agent/loop.ts` — Core agent loop (generateText + maxSteps)
- `src/ai/tools.ts` — 25 tool definitions with Zod schemas
- `src/browser/actions.ts` — Action executor + multi-strategy selector resolver
- `src/ai/prompt.ts` — System prompt with app context
- `src/parser/markdown-parser.ts` — Markdown → TestSuite[]
- `src/config/schema.ts` — Zod config schema
- `src/runner/suite-runner.ts` — Orchestrates test execution

## Conventions

- Imports use `.js` extension (NodeNext)
- Fresh browser page per test
- `done` tool has no execute — handled in agent loop
- Selector resolution: CSS → text → role → label → placeholder → testId
