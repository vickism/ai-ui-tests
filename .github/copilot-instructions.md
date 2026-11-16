# AI UI Tests — AI-Driven UI Testing Tool

## What This Is

CLI tool for AI-driven UI testing. Tests written in plain English markdown, executed by an AI agent controlling a real browser via Playwright.

## Architecture

Tests (.test.md) are parsed into suites/cases. For each test, an agent loop sends the test goal + page state (screenshot + ARIA tree) to an LLM via Vercel AI SDK. The AI responds with tool calls (click, type, navigate, assert, done) that AI UI Tests executes via Playwright. Loop repeats until the AI calls `done(pass/fail)`.

## Tech Stack

TypeScript (ESM), Playwright, Vercel AI SDK (`ai`), Commander.js, Zod, tsup, Vitest.

## Key Files

- `src/agent/loop.ts` — Core agent loop (generateText + stopWhen)
- `src/ai/tools.ts` — 25 tool definitions with Zod schemas
- `src/browser/actions.ts` — Action executor + multi-strategy selector resolver
- `src/ai/prompt.ts` — System prompt with app context
- `src/parser/markdown-parser.ts` — Markdown → TestSuite[]
- `src/config/schema.ts` — Zod config schema
- `src/version.ts` — CLI version from package.json in source and packaged builds
- `src/runner/suite-runner.ts` — Orchestrates test execution

## Conventions

- Imports use `.js` extension (NodeNext)
- Fresh browser page per test
- `done` tool has no execute — handled in agent loop
- Selector resolution: CSS → text → role → label → placeholder → testId

## Releases and PR Titles

- Use Conventional Commit PR titles and squash-merge using the title: `fix: ...`,
  `feat: ...`, or `feat!: ...`. Scopes such as `fix(deps): ...` are supported.
- Release Please automatically maintains a release PR with package versions,
  lockfile, and changelog. Merge the release PR to create its GitHub tag/release
  and start npm preparation; publication requires the configured `npm` approval.
- Below 1.0, fixes bump patch and features/breaking changes bump minor; at 1.0+,
  breaking changes bump major. Keep routine version bumps and the release manifest
  under Release Please control. Read CLI version from package.json, never hardcode it.
- Preserve audit, lint, type checks, tests, packed CLI checks, OIDC, and the
  separation of release bot credentials from repository-code execution.
- Follow [RELEASING.md](../RELEASING.md) for setup, version policy, and retries.
