/**
 * The `ai-ui-tests init` command — scaffolds AI UI Tests files in the current project.
 *
 * Creates three files (skips any that already exist):
 *   - ai-ui-tests.config.ts  — configuration with base URL, AI provider, browser settings
 *   - tests/example.test.md — sample test file with plain English test cases
 *   - ai-ui-tests.md — starter app context file for describing the application
 */

import { Command } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '../../utils/logger.js'

const TEMPLATES: Array<{ src: string; dest: string; destDir?: string }> = [
  { src: 'ai-ui-tests.config.ts', dest: 'ai-ui-tests.config.ts' },
  { src: 'example.test.md', dest: 'tests/example.test.md', destDir: 'tests' },
  { src: 'ai-ui-tests.md', dest: 'ai-ui-tests.md' },
]

export const initCommand = new Command('init').description('Initialize AI UI Tests in the current project').action(async () => {
  const cwd = process.cwd()
  logger.info('Initializing AI UI Tests...')
  logger.blank()

  let created = 0

  for (const template of TEMPLATES) {
    const destPath = path.resolve(cwd, template.dest)

    if (fs.existsSync(destPath)) {
      logger.warn(`Skipping ${template.dest} (already exists)`)
      continue
    }

    if (template.destDir) {
      const dir = path.resolve(cwd, template.destDir)
      fs.mkdirSync(dir, { recursive: true })
    }

    const templateDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'templates')
    const srcPath = path.join(templateDir, template.src)
    const content = fs.readFileSync(srcPath, 'utf-8')
    fs.writeFileSync(destPath, content)
    logger.success(`Created ${template.dest}`)
    created++
  }

  logger.blank()
  if (created > 0) {
    logger.success(`Done! Created ${created} file${created > 1 ? 's' : ''}.`)
    logger.blank()
    logger.info('Next steps:')
    logger.info('  1. Edit ai-ui-tests.config.ts with your base URL')
    logger.info('  2. Edit ai-ui-tests.md to describe your app')
    logger.info('  3. Write tests in tests/*.test.md')
    logger.info('  4. Run: ai-ui-tests run')
  } else {
    logger.info('Nothing to create — AI UI Tests is already initialized.')
  }
})
