/**
 * Loads app context files (synth.md and README.md) that describe the
 * application under test. This content is injected into the AI's system
 * prompt so it understands the app's pages, features, and terminology
 * before running any tests.
 */

import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';

const CONTEXT_FILES = ['synth.md', 'README.md'];

export interface AppContext {
  content: string;
  sources: string[];
}

export function loadAppContext(cwd: string = process.cwd()): AppContext {
  const sources: string[] = [];
  const parts: string[] = [];

  for (const filename of CONTEXT_FILES) {
    const filePath = path.resolve(cwd, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        if (content) {
          parts.push(`--- ${filename} ---\n${content}`);
          sources.push(filename);
          logger.debug(`Loaded context from ${filename}`);
        }
      } catch {
        logger.warn(`Failed to read ${filename}, skipping`);
      }
    }
  }

  if (parts.length === 0) {
    logger.warn(
      'No context files found (synth.md, README.md). The AI will have limited understanding of your app.'
    );
  }

  return {
    content: parts.join('\n\n'),
    sources,
  };
}
