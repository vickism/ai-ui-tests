import { Command } from 'commander';
import { logger } from '../../utils/logger.js';

export const runCommand = new Command('run')
  .description('Run tests from a file or directory')
  .argument('[path]', 'path to test file or directory', './tests')
  .option('--headed', 'run browser in headed mode')
  .option('--base-url <url>', 'override base URL')
  .option('--timeout <ms>', 'override timeout in milliseconds', parseInt)
  .option('--screenshot-dir <dir>', 'directory for screenshots')
  .option('--grep <pattern>', 'filter tests by name pattern')
  .option('--model <id>', 'override AI model (e.g., openai:gpt-4o)')
  .option('--verbose', 'show AI reasoning and debug output')
  .action(async (path: string, options: Record<string, unknown>) => {
    logger.info(`Running tests from: ${path}`);
    logger.debug('Options:', options);
    // TODO: Wire up config → parser → runner → reporter
    logger.warn('Not yet implemented. Coming in Phase 5.');
  });
