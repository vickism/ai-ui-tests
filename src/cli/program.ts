/**
 * Commander.js program definition with three subcommands:
 *   - ai-ui-tests run [path]  — run tests from a file or directory
 *   - ai-ui-tests init        — scaffold config + example test files
 *   - ai-ui-tests auth        — open browser for manual login, save auth state
 *
 * Global --debug flag enables debug-level logging for all commands.
 */

import { Command } from 'commander'
import pc from 'picocolors'
import { runCommand } from './commands/run.js'
import { initCommand } from './commands/init.js'
import { authCommand } from './commands/auth.js'
import { setLogLevel } from '../utils/logger.js'
import { version } from '../version.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('ai-ui-tests')
    .description(`${pc.bold('AI UI Tests')} — AI-driven UI testing. Write tests in plain English, let AI drive the browser.`)
    .version(version)
    .option('--debug', 'enable debug logging')
    .hook('preAction', (_thisCommand, actionCommand) => {
      const opts = actionCommand.optsWithGlobals()
      if (opts.debug) {
        setLogLevel('debug')
      }
    })

  program.addCommand(runCommand)
  program.addCommand(initCommand)
  program.addCommand(authCommand)

  return program
}
