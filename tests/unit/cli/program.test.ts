import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createProgram } from '../../../src/cli/program.js'

describe('CLI version', () => {
  it('reports the package version instead of a separate hardcoded version', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string }
    expect(createProgram().version()).toBe(packageJson.version)
  })
})
