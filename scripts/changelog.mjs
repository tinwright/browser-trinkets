#!/usr/bin/env node
// node scripts/changelog.mjs <name>: release notes for a tool's newest tag, from the conventional
// commits that touched its folder since its previous tag (feat → Features, fix → Fixes).

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ITEMS_DIR, ROOT_DIR } from './workshop.mjs';

const git = (/** @type {string[]} */ args) =>
  spawnSync('git', args, { cwd: ROOT_DIR, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);

const name = process.argv[2];
if (!name) {
  console.error('Usage: node scripts/changelog.mjs <name>');
  process.exit(2);
}
const [current, previous] = git(['tag', '--list', `${name}@*`, '--sort=-v:refname']);
const range = previous ? `${previous}..${current ?? 'HEAD'}` : (current ?? 'HEAD');
const subjects = git(['log', '--format=%s', range, '--', path.relative(ROOT_DIR, path.join(ITEMS_DIR, name))]);

/** @type {Record<string, string[]>} */
const groups = { Features: [], Fixes: [], Other: [] };
for (const subject of subjects) {
  const match = subject.match(/^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/);
  const text = match ? match[4] : subject;
  const group = match?.[1] === 'feat' ? 'Features' : match?.[1] === 'fix' ? 'Fixes' : 'Other';
  groups[group].push(`- ${text}${match?.[3] ? ' (breaking)' : ''}`);
}
const notes = Object.entries(groups)
  .filter(([, lines]) => lines.length)
  .map(([group, lines]) => `### ${group}\n\n${lines.join('\n')}`)
  .join('\n\n');
console.log(notes || 'No changes recorded.');
