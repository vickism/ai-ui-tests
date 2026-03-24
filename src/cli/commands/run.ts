import { Command } from 'commander';
import pc from 'picocolors';
import { loadConfig } from '../../config/loader.js';
import { loadAppContext } from '../../config/context.js';
import { discoverTestFiles, parseTestFiles } from '../../parser/index.js';
import { createModel } from '../../ai/provider.js';
import { createReporter } from '../../reporter/index.js';
import { runSuites } from '../../runner/suite-runner.js';
import { logger, setLogLevel } from '../../utils/logger.js';

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
  .action(async (testPath: string, options: Record<string, unknown>) => {
    if (options.verbose) {
      setLogLevel('debug');
    }

    console.log();
    console.log(`  ${pc.bold('Synth')} ${pc.gray('v0.1.0')}`);

    try {
      // Load config
      const config = await loadConfig(process.cwd(), {
        baseUrl: options.baseUrl as string | undefined,
        headed: options.headed as boolean | undefined,
        timeout: options.timeout as number | undefined,
        screenshotDir: options.screenshotDir as string | undefined,
        model: options.model as string | undefined,
      });

      // Load app context
      const appContext = loadAppContext(process.cwd());

      // Discover and parse test files
      const testFiles = discoverTestFiles(testPath);
      if (testFiles.length === 0) {
        logger.error(`No test files found in ${testPath}`);
        logger.info('Test files should end with .test.md');
        logger.info('Run "synth init" to create an example test.');
        process.exit(1);
      }

      const suites = parseTestFiles(testFiles);
      const totalTests = suites.reduce((sum, s) => sum + s.tests.length, 0);
      logger.info(
        `Found ${totalTests} test${totalTests !== 1 ? 's' : ''} in ${testFiles.length} file${testFiles.length !== 1 ? 's' : ''}`
      );
      logger.info(`Base URL: ${config.baseUrl}`);
      logger.info(`AI: ${config.ai.provider}/${config.ai.model}`);

      // Create AI model
      const model = createModel(config);

      // Create reporter
      const reporter = createReporter(config.reporter);

      // Run all suites
      const result = await runSuites({
        suites,
        model,
        config,
        appContext: appContext.content,
        reporter,
        grep: options.grep as string | undefined,
      });

      // Exit with appropriate code
      process.exit(result.totalFailed > 0 ? 1 : 0);
    } catch (err) {
      logger.error(
        err instanceof Error ? err.message : String(err)
      );
      process.exit(1);
    }
  });
