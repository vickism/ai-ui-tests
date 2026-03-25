/**
 * Parses .test.md files into structured TestSuite objects.
 *
 * Two parsing modes:
 *   - Simple (parseMarkdownTests): headings → suites, bullets → tests. Fast, no AI.
 *   - AI-powered (parseMarkdownTestsWithAI): asks the AI to analyze the test file
 *     and suggest window grouping (which tests can share a browser page).
 *     Falls back to simple parsing on any AI failure.
 */

import { generateText, type LanguageModel, type ModelMessage } from 'ai'
import { z } from 'zod'
import { ParseError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import type { TestCase, TestSuite, TestWindowGroup } from './types.js'

const aiParseSchema = z.object({
  suites: z.array(
    z.object({
      name: z.string().min(1),
      tests: z.array(z.string().min(1)).min(1),
      groups: z
        .array(
          z.object({
            id: z.string().min(1),
            tests: z.array(z.string().min(1)).min(1),
            reason: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
})

type AiParseOutput = z.infer<typeof aiParseSchema>

function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced && fenced[1]) {
    return fenced[1]
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return text.slice(start, end + 1)
}

function buildFallbackGroups(tests: TestCase[]): TestWindowGroup[] {
  return tests.map((testCase, index) => ({
    id: `window-${index + 1}`,
    tests: [testCase],
    reason: 'fallback-isolation',
  }))
}

function normalizeSuite(suite: AiParseOutput['suites'][number], sourceFile: string): TestSuite | null {
  const testNames = suite.tests.map((name) => name.trim()).filter(Boolean)
  if (testNames.length === 0) {
    return null
  }

  const tests: TestCase[] = testNames.map((name) => ({
    name,
    suite: suite.name,
  }))

  const nameToTest = new Map(tests.map((testCase) => [testCase.name, testCase]))
  const seen = new Set<string>()
  const groups: TestWindowGroup[] = []

  if (suite.groups && suite.groups.length > 0) {
    for (const group of suite.groups) {
      const uniqueNames = Array.from(new Set(group.tests))
      const groupTests: TestCase[] = []

      for (const testName of uniqueNames) {
        const testCase = nameToTest.get(testName)
        if (!testCase || seen.has(testName)) {
          return null
        }
        seen.add(testName)
        groupTests.push(testCase)
      }

      if (groupTests.length === 0) {
        return null
      }

      groups.push({
        id: group.id,
        tests: groupTests,
        reason: group.reason,
      })
    }
  }

  if (groups.length === 0 || seen.size !== tests.length) {
    return {
      name: suite.name,
      tests,
      groups: buildFallbackGroups(tests),
      sourceFile,
    }
  }

  return {
    name: suite.name,
    tests,
    groups,
    sourceFile,
  }
}

export function parseMarkdownTests(content: string, sourceFile: string): TestSuite[] {
  const lines = content.split('\n')
  const suites: TestSuite[] = []
  let currentSuiteName = 'Default'
  let currentTests: TestCase[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Heading = suite name
    const headingMatch = trimmed.match(/^#+\s+(.+)$/)
    if (headingMatch) {
      // Save previous suite if it has tests
      if (currentTests.length > 0) {
        suites.push({
          name: currentSuiteName,
          tests: currentTests,
          sourceFile,
        })
      }
      currentSuiteName = headingMatch[1].trim()
      currentTests = []
      continue
    }

    // Bullet point = test case
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      const testName = bulletMatch[1].trim()
      if (testName) {
        currentTests.push({
          name: testName,
          suite: currentSuiteName,
        })
      }
      continue
    }
  }

  // Save last suite
  if (currentTests.length > 0) {
    suites.push({
      name: currentSuiteName,
      tests: currentTests,
      sourceFile,
    })
  }

  if (suites.length === 0) {
    throw new ParseError(`No tests found in ${sourceFile}. Tests should be bullet points (- or *) under markdown headings (#).`)
  }

  return suites
}

export async function parseMarkdownTestsWithAI(
  content: string,
  sourceFile: string,
  model: LanguageModel,
  appContext: string,
): Promise<TestSuite[]> {
  const prompt = `You are a QA test planner. Parse the markdown into suites and tests, then group tests into browser windows.

Rules:
- Use markdown headings as suite names.
- Use bullet points (- or *) as tests.
- If there are tests before any heading, put them in a suite named "Default".
- Every test must appear exactly once in the groups for its suite.
- If unsure about grouping, isolate the test into its own window.
- Output JSON only, with no extra text.

Return JSON in this format:
{"suites":[{"name":"Suite Name","tests":["Test A"],"groups":[{"id":"window-1","tests":["Test A"],"reason":"isolated"}]}]}`

  const messages: ModelMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `${prompt}\n\nSource File: ${sourceFile}\n\nMarkdown:\n${content}\n\nApp Context:\n${appContext ?? ''}`,
        },
      ],
    },
  ]

  try {
    logger.debug(`AI parsing tests from: "${sourceFile}"`)
    const result = await generateText({
      model,
      messages,
    })

    const jsonText = extractJson(result.text)
    if (!jsonText) {
      logger.warn(`AI parsing returned no JSON for: "${sourceFile}"`)
      const fallback = parseMarkdownTests(content, sourceFile)
      return fallback.map((suite) => ({
        ...suite,
        groups: buildFallbackGroups(suite.tests),
      }))
    }

    const parsed = aiParseSchema.safeParse(JSON.parse(jsonText))
    if (!parsed.success) {
      logger.warn(`AI parsing JSON invalid for: "${sourceFile}"`)
      const fallback = parseMarkdownTests(content, sourceFile)
      return fallback.map((suite) => ({
        ...suite,
        groups: buildFallbackGroups(suite.tests),
      }))
    }

    const suites: TestSuite[] = []
    for (const suite of parsed.data.suites) {
      const normalized = normalizeSuite(suite, sourceFile)
      if (!normalized) {
        logger.warn(`AI parsing incomplete for suite: "${suite.name}"`)
        const fallback = parseMarkdownTests(content, sourceFile)
        return fallback.map((fallbackSuite) => ({
          ...fallbackSuite,
          groups: buildFallbackGroups(fallbackSuite.tests),
        }))
      }
      suites.push(normalized)
    }

    if (suites.length === 0) {
      throw new ParseError(`No tests found in ${sourceFile}. Tests should be bullet points (- or *) under markdown headings (#).`)
    }

    return suites
  } catch (err) {
    logger.warn(`AI parsing failed for "${sourceFile}": ${err instanceof Error ? err.message : String(err)}`)
    const fallback = parseMarkdownTests(content, sourceFile)
    return fallback.map((suite) => ({
      ...suite,
      groups: buildFallbackGroups(suite.tests),
    }))
  }
}
