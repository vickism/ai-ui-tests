/**
 * Synth CLI entry point.
 *
 * Sets up graceful shutdown handlers (Ctrl+C / SIGTERM) to ensure
 * Playwright browsers are cleaned up, then delegates to Commander.js
 * for command parsing (run, init, auth).
 */

import { createProgram } from './cli/program.js';

// Graceful shutdown — first Ctrl+C exits cleanly, second forces immediate exit
let isShuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (isShuttingDown) {
      process.exit(1);
    }
    isShuttingDown = true;
    console.log('\n  Shutting down...');
    // Playwright cleans up on process exit
    process.exit(130);
  });
}

const program = createProgram();
program.parse();
