import fs from 'node:fs'
import path from 'node:path'
import { parseMarkdownTests, parseMarkdownTestsWithAI } from './markdown-parser.js'
import type { LanguageModel } from 'ai'
import { ParseError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import type { TestSuite } from './types.js'

const TEST_EXTENSIONS = ['.test.md', '.tests.md', '.ai-ui-tests.md']

export function discoverTestFiles(targetPath: string): string[] {
  const resolved = path.resolve(targetPath)

  if (!fs.existsSync(resolved)) {
    throw new ParseError(`Path not found: ${resolved}`)
  }

  const stat = fs.statSync(resolved)

  if (stat.isFile()) {
    return [resolved]
  }

  if (stat.isDirectory()) {
    return findTestFilesRecursive(resolved)
  }

  throw new ParseError(`Invalid path: ${resolved}`)
}

function findTestFilesRecursive(dir: string): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      files.push(...findTestFilesRecursive(fullPath))
    } else if (entry.isFile() && TEST_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath)
    }
  }

  return files.sort()
}

export function parseTestFiles(filePaths: string[]): TestSuite[] {
  const allSuites: TestSuite[] = []

  for (const filePath of filePaths) {
    logger.debug(`Parsing ${filePath}`)
    const content = fs.readFileSync(filePath, 'utf-8')
    const suites = parseMarkdownTests(content, filePath)
    allSuites.push(...suites)
  }

  return allSuites
}

export async function parseTestFilesWithAI(filePaths: string[], model: LanguageModel, appContext: string): Promise<TestSuite[]> {
  const allSuites: TestSuite[] = []

  for (const filePath of filePaths) {
    logger.debug(`Parsing ${filePath}`)
    const content = fs.readFileSync(filePath, 'utf-8')
    const suites = await parseMarkdownTestsWithAI(content, filePath, model, appContext)
    allSuites.push(...suites)
  }

  return allSuites
}

export { type TestSuite, type TestCase } from './types.js'
