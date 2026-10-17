// This workshop's rules for npm run check, and its build step: each Firefox-ready extension gets
// an updates.json on the site, which its manifest's update_url points to.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { IGNORED } from './package.mjs';
import { ROOT_DIR } from './workshop.mjs';
import config from '../site.config.js';

/** APIs and manifest keys only Chrome has. An extension using one is marked Chrome-only. */
const CHROME_ONLY_APIS = /\bchrome\.(sidePanel|offscreen|declarativeContent|tabGroups|readingList|enterprise)\b/;
const CHROME_ONLY_KEYS = ['side_panel', 'oauth2', 'key', 'minimum_chrome_version'];
const CHROME_ONLY_PERMISSIONS = ['offscreen', 'sidePanel', 'declarativeContent', 'tabGroups'];

/** web-ext lint findings this workshop expects: Firefox ignoring the Chrome half of background. */
const EXPECTED_LINT = new Set(['BACKGROUND_SERVICE_WORKER_IGNORED']);

/** Code fetched from elsewhere and run, which both stores refuse. */
const REMOTE_CODE = [/<script[^>]+src=["']https?:/i, /import\(\s*["']https?:/, /\beval\(/, /new Function\(/];

/** The update manifest's address for an extension, which its update_url must name. */
export const updatesUrl = (/** @type {string} */ name) =>
  `${config.siteUrl}/${config.itemsDir}/${name}/updates.json`;

/** A release's download, as the release workflow names it. */
export const releaseFile = (/** @type {string} */ name, /** @type {string} */ version, /** @type {'chrome.zip' | 'firefox.xpi'} */ kind) =>
  `${config.repoUrl}/releases/download/${encodeURIComponent(`${name}@${version}`)}/${name}-${version}-${kind}`;

export default {
  /**
   * @param {import('./items.mjs').Item} item
   * @param {string[]} files
   */
  check(item, files) {
    if (!files.includes('manifest.json')) return ['no manifest.json'];
    /** @type {string[]} */
    const problems = [];
    const manifest = JSON.parse(fs.readFileSync(path.join(item.dir, 'manifest.json'), 'utf8'));
    const forFirefox = item.browsers.includes('firefox');

    if (manifest.manifest_version !== 3) problems.push('use Manifest V3');
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? '')) problems.push('version should look like 1.2.3');
    if (!manifest.description) problems.push('the manifest needs a description');
    if (manifest.host_permissions?.length)
      problems.push('move host_permissions to optional_host_permissions, and ask with chrome.permissions.request when needed');
    for (const script of manifest.content_scripts ?? [])
      if (script.matches?.includes('<all_urls>')) problems.push('a content script runs on <all_urls>; narrow it, or inject on demand with activeTab');

    const background = manifest.background;
    if (background && forFirefox && (!background.service_worker || background.scripts?.[0] !== background.service_worker))
      problems.push('background needs both "service_worker" (Chrome) and "scripts" (Firefox), naming the same file');

    const code = files
      .filter((file) => /\.(m?js|html)$/.test(file) && !file.endsWith('.test.mjs'))
      .map((file) => [file, fs.readFileSync(path.join(item.dir, file), 'utf8')]);
    for (const [file, text] of code)
      if (REMOTE_CODE.some((pattern) => pattern.test(text))) problems.push(`${file} runs code from elsewhere (remote script, eval or new Function)`);

    if (forFirefox) {
      const gecko = manifest.browser_specific_settings?.gecko ?? {};
      if (gecko.id !== `${item.name}@tinwright`) problems.push(`browser_specific_settings.gecko.id should be "${item.name}@tinwright", and never change`);
      if (JSON.stringify(gecko.data_collection_permissions?.required) !== '["none"]')
        problems.push('declare gecko.data_collection_permissions: { "required": ["none"] }');
      if (gecko.update_url !== updatesUrl(item.name)) problems.push(`gecko.update_url should be ${updatesUrl(item.name)}`);

      const chromeOnly = [
        ...code.filter(([, text]) => CHROME_ONLY_APIS.test(text)).map(([file]) => `${file} uses a Chrome-only API`),
        ...CHROME_ONLY_KEYS.filter((key) => key in manifest).map((key) => `the manifest's "${key}" is Chrome-only`),
        ...(manifest.permissions ?? []).filter((/** @type {string} */ permission) => CHROME_ONLY_PERMISSIONS.includes(permission)).map((/** @type {string} */ permission) => `the "${permission}" permission is Chrome-only`),
      ];
      for (const message of chromeOnly) problems.push(`${message}: mark it Chrome-only with item.json { "browsers": ["chrome"] }`);

      const lint = spawnSync(
        path.join(ROOT_DIR, 'node_modules', '.bin', 'web-ext'),
        ['lint', '--source-dir', item.dir, '--self-hosted', '--output', 'json', '--ignore-files', ...IGNORED],
        { encoding: 'utf8' },
      );
      const report = JSON.parse(lint.stdout || '{}');
      for (const message of [...(report.errors ?? []), ...(report.warnings ?? [])].filter((one) => !EXPECTED_LINT.has(one.code)))
        problems.push(`web-ext lint: ${message.message}${message.file ? ` (${message.file})` : ''}`);
      if (lint.status !== 0 && !report.errors?.length) problems.push(`web-ext lint failed:\n${lint.stderr}`);
    }
    return problems;
  },

  /**
   * Writes extensions/<name>/updates.json for each Firefox extension: where Firefox looks for its
   * newest version, the signed .xpi attached to that version's release.
   * @param {{ outDir: string, items: import('./items.mjs').Item[] }} build
   */
  afterBuild({ outDir, items }) {
    for (const item of items) {
      if (!item.browsers.includes('firefox') || !item.geckoId || !item.version) continue;
      const file = path.join(outDir, config.itemsDir, item.name, 'updates.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const updates = { addons: { [item.geckoId]: { updates: [{ version: item.version, update_link: releaseFile(item.name, item.version, 'firefox.xpi') }] } } };
      fs.writeFileSync(file, `${JSON.stringify(updates, null, 2)}\n`);
    }
  },
};
