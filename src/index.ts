import { createProgram } from './cli/program.js';

// Graceful shutdown
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
