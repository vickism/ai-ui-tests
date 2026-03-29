# Synth

AI-driven UI testing. Write tests in plain English, let AI drive the browser.

```bash
npx synth-test run
```

Synth reads your test descriptions, launches a real browser, and uses an AI agent to navigate your app like a real user — clicking buttons, filling forms, and verifying outcomes. No selectors, no code, just English.

## Install

```bash
npm install synth-test --save-dev

# Install browser binaries
npx playwright install chromium
```

## Quick Start

```bash
# Scaffold config + example test
npx synth init

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Start your app, then run tests
npx synth run
```

That's it. Synth creates three files:

- `synth.config.ts` — points to your app's URL
- `synth.md` — describes your app so the AI understands it
- `tests/example.test.md` — a sample test to get started

## Writing Tests

Tests are markdown files. Headings are suites, bullet points are tests:

```markdown
# Authentication

- The user should be able to sign up with a new email
- The user should be able to log in with existing credentials
- The user should see an error when logging in with wrong credentials

# Dashboard

- The user can see their profile information
- The user can update their display name
```

Save as `tests/auth.test.md` and run `npx synth run`. Each bullet is a standalone test that the AI will execute step by step.

## App Context

Create a `synth.md` file in your project root to describe your app. This is what makes plain English tests work — the AI reads it before every test:

```markdown
# My App

A task management app where users create projects and manage tasks.

## Pages

- / — Home page with sign up CTA
- /login — Login form
- /signup — Registration form
- /dashboard — User dashboard (requires auth)

## Key Terms

- "Workspace" = a team's shared space
- "Board" = a kanban-style task board
```

The more context you provide (pages, features, terminology, edge cases), the better the tests work.

## Configuration

Create `synth.config.ts` in your project root:

```typescript
export default {
  baseUrl: 'http://localhost:3000',

  ai: {
    provider: 'anthropic',       // anthropic | openai | azure | google | mistral
    model: 'claude-sonnet-4-20250514',
    maxIterations: 30,           // max browser actions per test
  },

  browser: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    browserType: 'chromium',     // chromium | firefox | webkit
    storageState: './synth-auth.json',  // Playwright auth state (optional)
  },

  screenshots: {
    dir: './synth-screenshots',
    onFailure: true,
    onSuccess: false,
  },

  memory: {
    enabled: true,               // learn from previous runs
    dir: './synth-memory',
  },
};
```

All fields except `baseUrl` have sensible defaults — you can start with just:

```typescript
export default {
  baseUrl: 'http://localhost:3000',
};
```

## CLI

```
synth run [path]              Run tests (default: ./tests/)
synth init                    Scaffold config + example test
synth auth                    Log in manually and save browser auth state
```

### Options

| Flag | Description |
|------|-------------|
| `--headed` | Show the browser window |
| `--base-url <url>` | Override base URL |
| `--timeout <ms>` | Override timeout |
| `--screenshot-dir <dir>` | Screenshot output directory |
| `--grep <pattern>` | Filter tests by name |
| `--model <id>` | Override AI model |
| `--no-memory` | Disable selector memory for this run |
| `--verbose` | Show AI reasoning and step details |
| `--debug` | Enable debug logging |

### Examples

```bash
# Run all tests with browser visible
npx synth run --headed

# Run only login tests
npx synth run --grep "log in"

# Use OpenAI instead of Anthropic
OPENAI_API_KEY=sk-... npx synth run --model gpt-4o

# Verbose mode to see AI reasoning
npx synth run --verbose

# Run without learning from previous runs
npx synth run --no-memory
```

## Selector Memory

Synth learns from previous test runs. After each test, the AI extracts which selectors worked and saves them to `synth-memory/`. On subsequent runs, these known-good selectors are injected into the AI's context so it prefers them — reducing retries and making tests faster and more reliable.

Memory is:
- **Advisory** — the AI can ignore stale entries if the page has changed
- **Additive** — confidence grows with each successful reuse
- **Fault-tolerant** — corrupted files silently reset, errors never break tests

Disable with `--no-memory` or set `memory.enabled: false` in config. The `synth-memory/` directory can be committed to version control to share learnings across your team.

## Authentication

Synth supports all Playwright authentication mechanisms:

### Option 1: Manual Login + Saved State

```bash
npx synth auth                    # Opens browser, saves to synth-auth.json
npx synth auth -o my-auth.json    # Custom output path
```

Then reference it in your config:

```typescript
export default {
  browser: {
    storageState: './synth-auth.json',
  },
};
```

### Option 2: Auth Bypass for Testing

Add a test mode to your app that skips real authentication (recommended for CI):

```typescript
browser: {
  contextOptions: {
    extraHTTPHeaders: { 'X-Test-Auth': 'true' },
  },
},
```

### Option 3: Playwright Context Options

Pass any Playwright `BrowserContextOptions` through the config:

```typescript
browser: {
  contextOptions: {
    httpCredentials: { username: 'admin', password: 'secret' },
    extraHTTPHeaders: { 'Authorization': 'Bearer token' },
  },
},
```

## How It Works

```
┌─────────┐       tool call         ┌─────────┐      Playwright       ┌─────────┐
│         │  "click Sign Up btn"    │         │   page.click(...)     │         │
│   AI    │ ──────────────────────→ │  Synth  │ ───────────────────→  │ Browser │
│ (Brain) │                         │ (Coord) │                       │ (Hands) │
│         │ ←────────────────────── │         │ ←───────────────────  │         │
│         │  screenshot + aria tree │         │   new page state      │         │
└─────────┘                         └─────────┘                       └─────────┘
```

1. Synth loads app context from `synth.md` and remembered selectors from `synth-memory/`
2. Reads a test: *"The user should be able to create a new account"*
3. Captures browser state: screenshot + accessibility tree
4. Sends context + test goal + page state to the AI
5. AI responds with an action: `click("Sign Up")`, `type("Email", "user@test.com")`
6. Synth executes the action via Playwright
7. Captures new state, sends it back to the AI
8. Repeats until the AI calls `done(pass/fail)`
9. Extracts selector learnings and saves to memory for next run

The AI never directly touches the browser. It sees screenshots and element trees, decides what to do, and Synth executes it.

## AI Providers

Synth uses the [Vercel AI SDK](https://sdk.vercel.ai) for multi-provider support. Set the provider in your config and the corresponding API key:

| Provider | Config | Environment Variable |
|----------|--------|---------------------|
| Anthropic (default) | `provider: 'anthropic'` | `ANTHROPIC_API_KEY` |
| OpenAI | `provider: 'openai'` | `OPENAI_API_KEY` |
| Azure OpenAI | `provider: 'azure'` | `AZURE_API_KEY` |
| Google | `provider: 'google'` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Mistral | `provider: 'mistral'` | `MISTRAL_API_KEY` |

Or override per-run: `npx synth run --model gpt-4o`

## CI Integration

Synth exits with code 1 on any test failure:

```yaml
# GitHub Actions
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run UI tests
  run: npx synth run
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## License

MIT
