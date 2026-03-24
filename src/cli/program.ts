import { Command } from 'commander';
import pc from 'picocolors';
import { runCommand } from './commands/run.js';
import { initCommand } from './commands/init.js';
import { setLogLevel } from '../utils/logger.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('synth')
    .description(
      pc.bold('Synth') +
        ' — AI-driven UI testing. Write tests in plain English, let AI drive the browser.'
    )
    .version('0.1.0')
    .option('--debug', 'enable debug logging')
    .hook('preAction', (_thisCommand, actionCommand) => {
      const opts = actionCommand.optsWithGlobals();
      if (opts.debug) {
        setLogLevel('debug');
      }
    });

  program.addCommand(runCommand);
  program.addCommand(initCommand);

  return program;
}
