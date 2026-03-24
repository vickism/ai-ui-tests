import { Command } from 'commander';
import { logger } from '../../utils/logger.js';

export const initCommand = new Command('init')
  .description('Initialize Synth in the current project')
  .action(async () => {
    logger.info('Initializing Synth...');
    // TODO: Scaffold synth.config.ts, example.test.md, synth.md
    logger.warn('Not yet implemented. Coming in Phase 2.');
  });
