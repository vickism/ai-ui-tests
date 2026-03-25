# Synth

AI-driven UI testing. Write tests in plain English, let AI drive the browser.

```
synth run tests/
```

Synth reads your test descriptions, launches a real browser, and uses an AI agent to navigate your app like a real user — clicking buttons, filling forms, and verifying outcomes. No selectors, no code, just English.

## Quick Start

```bash
# Install
npm install

# Install browser binaries
npx playwright install

# Initialize in your project
npx tsx src/index.ts init

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run tests
npx tsx src/index.ts run
```

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

Save as `tests/auth.test.md` and run `synth run`.

## App Context

Create a `synth.md` file in your project root to describe your app. This gives the AI the context it needs to understand your application:

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

The AI reads this before running tests, so it knows your URL structure, features, and terminology. The more context you provide, the better the tests work.

## Configuration

Create `synth.config.ts` in your project root:

```typescript
export default {
  baseUrl: 'http://localhost:3000',

  ai: {
    provider: 'anthropic',       // anthropic | openai
    model: 'claude-sonnet-4-20250514',
    maxIterations: 30,
  },

  browser: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    // Playwright auth state (see Authentication section below)
    storageState: './synth-auth.json',
    // Any additional Playwright context options
    contextOptions: {},
  },

  screenshots: {
    dir: './synth-screenshots',
    onFailure: true,
    onSuccess: false,
  },
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
| `--verbose` | Show AI reasoning and debug output |
| `--debug` | Enable debug logging |

### Examples

```bash
# Run all tests with browser visible
synth run --headed

# Run only login tests
synth run --grep "log in"

# Use OpenAI instead of Anthropic
export OPENAI_API_KEY=sk-...
synth run --model gpt-4o

# Verbose mode to see what the AI is doing
synth run --verbose
```

## Authentication

Synth supports all Playwright authentication mechanisms. The recommended approaches:

### Option 1: Manual Login + Saved State

Use `synth auth` to open a browser, log in manually, and save the auth state:

```bash
synth auth                          # Opens browser, saves to synth-auth.json
synth auth -o my-auth.json          # Custom output path
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
// In your app: if AUTH_MODE=test, inject a mock user
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

1. Synth loads app context from `synth.md` and `README.md`
2. Reads a test: *"The user should be able to create a new account"*
3. Captures browser state: screenshot + accessibility tree
4. Sends context + test goal + page state to the AI
5. AI responds with an action: `click("Sign Up")`, `type("Email", "user@test.com")`
6. Synth executes the action via Playwright
7. Captures new state, sends it back to the AI
8. Repeats until the AI calls `done(pass/fail)`

The AI never directly touches the browser. It sees screenshots and element trees, decides what to do, and Synth executes it.

## AI Tools

The AI has 25 tools available:

**Actions**: `navigate`, `click`, `type`, `press_key`, `scroll`, `hover`, `select_option`, `check`, `uncheck`, `go_back`, `go_forward`, `drag_and_drop`, `upload_file`

**Dialogs**: `accept_dialog`, `dismiss_dialog`

**Reading**: `get_text`, `get_url`

**Assertions**: `assert_visible`, `assert_url`, `assert_text_contains`

**Waiting**: `wait`, `wait_for_element`, `wait_for_network_idle`

**Control**: `screenshot`, `done`

## CI Integration

Synth exits with code 1 on any test failure, so it works with any CI system:

```yaml
# GitHub Actions
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run UI tests
  run: npx synth run
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    AUTH_MODE: test   # If using auth bypass
```

## Tech Stack

- **TypeScript** — Full type safety
- **Playwright** — Cross-browser automation
- **Vercel AI SDK** (`ai` v6) — Unified API for Claude, OpenAI, and 20+ providers
- **Commander.js** — CLI framework
- **Zod** — Config and tool schema validation
- **Vitest** — 87 unit tests

## License

MIT
