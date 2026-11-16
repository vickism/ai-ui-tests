# AI UI Tests

AI-driven UI testing. Write tests in plain English, let AI drive the browser.

```bash
npx @vickism/ai-ui-tests run
```

AI UI Tests reads your test descriptions, launches a real browser, and uses an AI agent to navigate your app like a real user — clicking buttons, filling forms, and verifying outcomes. No selectors, no code, just English.

## Install

Requires Node.js `^20.19.0`, `^22.13.0`, or `>=24.0.0`.

```bash
npm install @vickism/ai-ui-tests --save-dev

# Install browser binaries
npx playwright install chromium
```

## Quick Start

```bash
# Scaffold config + example test
npx ai-ui-tests init
```

The command creates three files (and skips files that already exist). Before running tests:

- Set `baseUrl` in `ai-ui-tests.config.ts` to your app's URL.
- Describe your app in `ai-ui-tests.md`.
- Replace the sample cases in `tests/example.test.md` with tests for your app.

Set your API key for the default Anthropic provider:

```bash
# macOS / Linux
export ANTHROPIC_API_KEY=sk-ant-...
```

```powershell
# PowerShell
$env:ANTHROPIC_API_KEY = 'sk-ant-...'
```

For other providers, see [AI Providers](#ai-providers).

```bash
# Start your app, then run tests
npx ai-ui-tests run
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

Save as `tests/auth.test.md` and run `npx ai-ui-tests run`. Each bullet describes a test that the AI executes step by step. The AI planner can group related tests to share a browser page: the first test in each group starts at `baseUrl`, and subsequent tests continue from the previous page state. If grouping fails, each test gets its own page. With `browser.userDataDir`, all pages share a persistent browser context.

## App Context

Create an `ai-ui-tests.md` file in your project root to describe your app. AI UI Tests loads this file and your project's `README.md` at the start of a run and sends their contents to the configured AI provider as context for planning and executing tests:

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

Create `ai-ui-tests.config.ts` in your project root:

```typescript
export default {
  baseUrl: 'http://localhost:3000',

  ai: {
    provider: 'anthropic', // anthropic | openai | azure
    model: 'claude-sonnet-4-20250514',
    maxIterations: 30, // max AI steps per test
  },

  browser: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    browserType: 'chromium', // chromium | firefox | webkit
    // storageState: './ai-ui-tests-auth.json', // Enable after saving auth state
  },

  screenshots: {
    dir: './ai-ui-tests-screenshots',
    onFailure: true,
    onSuccess: false,
  },

  memory: {
    enabled: true, // learn from previous runs
    dir: './ai-ui-tests-memory',
  },
}
```

The default URL is `http://localhost:3000`. All settings have defaults, so you can start by setting your app's URL:

```typescript
export default {
  baseUrl: 'http://localhost:3000',
}
```

## CLI

```
ai-ui-tests run [path]              Run tests (default: ./tests/)
ai-ui-tests init                    Scaffold config + example test
ai-ui-tests auth                    Log in manually and save browser auth state
```

### Options

| Flag                     | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `--headed`               | Show the browser window                                 |
| `--base-url <url>`       | Override base URL                                       |
| `--timeout <ms>`         | Override timeout                                        |
| `--screenshot-dir <dir>` | Screenshot output directory                             |
| `--grep <pattern>`       | Filter suite or test names (case-insensitive substring) |
| `--file <pattern>`       | Filter filenames (case-insensitive substring)           |
| `--model <id>`           | Override AI model                                       |
| `--no-memory`            | Disable selector memory for this run                    |
| `--verbose`              | Show AI reasoning and step details                      |
| `--debug`                | Enable debug logging                                    |

### Examples

```bash
# Run all tests with browser visible
npx ai-ui-tests run --headed

# Run only login tests
npx ai-ui-tests run --grep "log in"

# Run files whose names contain "auth"
npx ai-ui-tests run --file auth

# Override the model after configuring ai.provider as 'openai'
npx ai-ui-tests run --model gpt-4o

# Verbose mode to see AI reasoning
npx ai-ui-tests run --verbose

# Run without learning from previous runs
npx ai-ui-tests run --no-memory
```

## Selector Memory

AI UI Tests learns from previous test runs. After each test, the AI extracts which selectors worked and saves them to `ai-ui-tests-memory/`. On subsequent runs, these known-good selectors are injected into the AI's context so it prefers them — reducing retries and making tests faster and more reliable.

Memory is:

- **Advisory** — the AI can ignore stale entries if the page has changed
- **Additive** — confidence grows with each successful reuse
- **Fault-tolerant** — corrupted files silently reset, errors never break tests

Disable with `--no-memory` or set `memory.enabled: false` in config. The `ai-ui-tests-memory/` directory can be committed to version control to share learnings across your team.

## Authentication

AI UI Tests supports saved browser state and authentication options passed through to Playwright:

### Option 1: Manual Login + Saved State

```bash
npx ai-ui-tests auth                    # Opens browser, saves to ai-ui-tests-auth.json
npx ai-ui-tests auth -o my-auth.json    # Custom output path
```

Log in, then close only the tab so the browser context remains available while the command saves its state. Closing the whole browser can prevent saving.

Then reference it in your config:

```typescript
export default {
  browser: {
    storageState: './ai-ui-tests-auth.json',
  },
}
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
AI ── tool calls ──> AI UI Tests ── Playwright actions ──> Browser
AI <── page state ── AI UI Tests <── screenshots + tree ── Browser
```

1. AI UI Tests loads app context from `ai-ui-tests.md` and `README.md`, plus remembered selectors from `ai-ui-tests-memory/`
2. Reads a test: _"The user should be able to create a new account"_
3. Captures browser state: screenshot + accessibility tree
4. Sends context + test goal + page state to the AI
5. AI responds with an action: `click("Sign Up")`, `type("Email", "user@test.com")`
6. AI UI Tests executes the action via Playwright
7. Captures new state, sends it back to the AI
8. Repeats until the AI calls `done(pass/fail)`
9. Extracts selector learnings and saves to memory for next run

The AI never directly touches the browser. It sees screenshots and element trees, decides what to do, and AI UI Tests executes it.

## AI Providers

AI UI Tests implements Anthropic, OpenAI, and Azure OpenAI through the Vercel AI SDK. Google and Mistral are accepted by the config schema but are not implemented by the model factory.

Set `ai.provider` and `ai.model` in `ai-ui-tests.config.ts`. Choose a model that supports images and tool calls. Changing the provider does not change the model automatically. The default pair is `anthropic` / `claude-sonnet-4-20250514`.

| Provider            | `ai.provider` | API key configuration                                        |
| ------------------- | ------------- | ------------------------------------------------------------ |
| Anthropic (default) | `'anthropic'` | `ANTHROPIC_API_KEY` environment variable, or `ai.apiKey`     |
| OpenAI              | `'openai'`    | `OPENAI_API_KEY` environment variable, or `ai.apiKey`        |
| Azure OpenAI        | `'azure'`     | Explicit `ai.apiKey`, plus `ai.resourceName` or `ai.baseURL` |

### Anthropic

Set `ANTHROPIC_API_KEY` as shown in [Quick Start](#quick-start), then configure:

```typescript
export default {
  baseUrl: 'http://localhost:3000',
  ai: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
}
```

### OpenAI

```bash
export OPENAI_API_KEY=sk-...
```

```powershell
$env:OPENAI_API_KEY = 'sk-...'
```

```typescript
export default {
  baseUrl: 'http://localhost:3000',
  ai: {
    provider: 'openai',
    model: 'gpt-4o',
  },
}
```

### Azure OpenAI

The Azure provider requires the key to be passed explicitly in config. Read it from an environment variable:

```bash
export AZURE_API_KEY=your-key
```

```powershell
$env:AZURE_API_KEY = 'your-key'
```

```typescript
export default {
  baseUrl: 'http://localhost:3000',
  ai: {
    provider: 'azure',
    model: 'your-deployment-name',
    apiKey: process.env.AZURE_API_KEY,
    resourceName: 'your-resource-name',
  },
}
```

Use your Azure deployment name for `model`. You can set `ai.baseURL` instead of `ai.resourceName` for a custom Azure endpoint.

For Anthropic and OpenAI, an explicit `ai.apiKey` takes precedence over the provider's environment variable. For example, use `apiKey: process.env.MY_AI_API_KEY` to read a custom variable. OpenAI also supports `ai.baseURL` when `ai.apiKey` is supplied. Keep actual keys out of committed configuration files. `.env` files are not loaded automatically; export variables in the shell that runs the command or load them through your runtime.

After configuring the provider and key, run `npx ai-ui-tests run`. To override only the model for that provider, use `npx ai-ui-tests run --model <model-id>`. There is no CLI provider switch.

## CI Integration

AI UI Tests exits with code 1 on any test failure:

```yaml
# GitHub Actions
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run UI tests
  run: npx ai-ui-tests run
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Maintainer Releases

Versions and changelogs are managed automatically by Release Please. Use Conventional Commit
PR titles such as `fix: handle timeouts` or `feat: support a new browser` and squash-merge them.
Merge the generated release PR when ready, then approve the npm deployment after checks pass.
For setup, version policy, and retry instructions, see [Releasing](RELEASING.md).

## License

MIT
