import { readFileSync } from 'node:fs'

// Both src/version.ts and the bundled dist/index.js sit one level below package.json.
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }

export const version = packageJson.version
