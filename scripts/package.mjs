#!/usr/bin/env node
// npm run package -- <name> [--out <folder>]: zips an extension for release, without its tests,
// READMEs and catalog files. The same zip loads in Chrome and is what Firefox signing takes.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import webExt from 'web-ext';
import { ITEMS_DIR, ROOT_DIR } from './workshop.mjs';

/** What stays out of a packaged extension. */
export const IGNORED = ['*.test.mjs', 'README*.md', 'item.json', 'screenshot.png'];

/**
 * Zips extensions/<name> into `outDir` as <name>-<version>-chrome.zip.
 * @param {string} name
 * @param {string} outDir
 * @returns {Promise<string>} the zip's path
 */
export async function packageExtension(name, outDir) {
  const sourceDir = path.join(ITEMS_DIR, name);
  const { version } = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
  const filename = `${name}-${version}-chrome.zip`;
  await webExt.cmd.build(
    { sourceDir, artifactsDir: outDir, filename, overwriteDest: true, ignoreFiles: IGNORED },
    { shouldExitProgram: false, showReadyMessage: false },
  );
  return path.join(outDir, filename);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string', default: path.join(ROOT_DIR, 'build') } },
  });
  if (positionals.length !== 1) {
    console.error('Usage: npm run package -- <name> [--out <folder>]');
    process.exit(2);
  }
  console.log(await packageExtension(positionals[0], path.resolve(values.out)));
}
