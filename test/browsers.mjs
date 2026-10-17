// Opens an extension in a real browser for a test, behind one small interface, so each test is
// written once and runs in Chrome and Firefox alike. Chrome runs through Playwright with the
// folder loaded unpacked. Playwright can't load extensions into Firefox, so Firefox runs through
// geckodriver (selenium-webdriver), with the packaged zip installed as a temporary add-on.
//
// BROWSERS=chrome or BROWSERS=firefox runs just one. FIREFOX_BIN picks the Firefox to use; on a Mac
// without it, the first of Firefox, Firefox Developer Edition and Firefox Nightly that's installed.

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { packageExtension } from '../scripts/package.mjs';
import { ITEMS_DIR } from '../scripts/workshop.mjs';

/**
 * A page of the extension, the same in either browser.
 * @typedef {{
 *   fill: (selector: string, text: string) => Promise<void>,
 *   click: (selector: string) => Promise<void>,
 *   text: (selector: string) => Promise<string>,
 *   waitForValue: (selector: string) => Promise<string>,
 *   reload: () => Promise<void>,
 * }} ExtensionPage
 * @typedef {{ open: (file: string) => Promise<ExtensionPage>, close: () => Promise<void> }} OpenExtension
 */

/** @param {string} name */
const manifestOf = (name) => JSON.parse(fs.readFileSync(path.join(ITEMS_DIR, name, 'manifest.json'), 'utf8'));

/**
 * The browsers an extension supports (its item.json `browsers`, else both), narrowed by $BROWSERS.
 * @param {string} name
 * @returns {('chrome' | 'firefox')[]}
 */
export function browsersFor(name) {
  const itemFile = path.join(ITEMS_DIR, name, 'item.json');
  const supported = fs.existsSync(itemFile)
    ? (JSON.parse(fs.readFileSync(itemFile, 'utf8')).browsers ?? ['chrome', 'firefox'])
    : ['chrome', 'firefox'];
  const wanted = process.env.BROWSERS?.split(',').map((one) => one.trim());
  return supported.filter((/** @type {string} */ one) => !wanted || wanted.includes(one));
}

/** Polls `read` until it gives a non-empty string, for up to five seconds. */
async function waitFor(/** @type {() => Promise<string>} */ read) {
  const end = Date.now() + 5_000;
  for (;;) {
    const value = await read();
    if (value || Date.now() > end) return value;
    await new Promise((done) => setTimeout(done, 100));
  }
}

/**
 * @param {'chrome' | 'firefox'} browser
 * @param {string} name the extension's folder under extensions/
 * @returns {Promise<OpenExtension>}
 */
export function openExtension(browser, name) {
  return browser === 'chrome' ? openInChrome(name) : openInFirefox(name);
}

/** @param {string} name @returns {Promise<OpenExtension>} */
async function openInChrome(name) {
  const dir = path.join(ITEMS_DIR, name);
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const id = new URL(worker.url()).host;
  return {
    async open(file) {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${id}/${file}`);
      return {
        fill: (selector, text) => page.fill(selector, text),
        click: (selector) => page.click(selector),
        text: async (selector) => (await page.textContent(selector)) ?? '',
        waitForValue: (selector) => waitFor(() => page.inputValue(selector)),
        reload: async () => {
          await page.reload();
        },
      };
    },
    close: () => context.close(),
  };
}

/** The Firefox binary to drive, or undefined to let Selenium find one. */
function firefoxBinary() {
  if (process.env.FIREFOX_BIN) return process.env.FIREFOX_BIN;
  if (os.platform() !== 'darwin') return undefined;
  return ['Firefox', 'Firefox Developer Edition', 'Firefox Nightly']
    .map((app) => `/Applications/${app}.app/Contents/MacOS/firefox`)
    .find((binary) => fs.existsSync(binary));
}

/** @param {string} name @returns {Promise<OpenExtension>} */
async function openInFirefox(name) {
  const id = manifestOf(name).browser_specific_settings.gecko.id;
  // Firefox gives each install a random moz-extension:// host; this fixes it so pages can be opened.
  const uuid = randomUUID();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  const zip = await packageExtension(name, out);
  const options = new firefox.Options()
    // A separate instance, so a Firefox already open on this machine doesn't take over the test.
    .addArguments('-headless', '-no-remote', '-new-instance')
    .setPreference('extensions.webextensions.uuids', JSON.stringify({ [id]: uuid }));
  const binary = firefoxBinary();
  if (binary) options.setBinary(binary);
  // System access lets the test open extension pages, which WebDriver can't navigate to directly.
  const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');
  const driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .setFirefoxService(service)
    .build();
  await driver.installAddon(zip, true);
  return {
    async open(file) {
      // Opened as a new tab from the browser's own (chrome) context, then driven like any page.
      const before = await driver.getAllWindowHandles();
      await driver.setContext(firefox.Context.CHROME);
      await driver.executeScript(
        'gBrowser.selectedTab = gBrowser.addTab(arguments[0], { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });',
        `moz-extension://${uuid}/${file}`,
      );
      await driver.setContext(firefox.Context.CONTENT);
      const handle = (await driver.getAllWindowHandles()).find((one) => !before.includes(one));
      if (handle) await driver.switchTo().window(handle);
      const find = (/** @type {string} */ selector) => driver.findElement(By.css(selector));
      return {
        fill: async (selector, text) => {
          const element = await find(selector);
          await element.clear();
          await element.sendKeys(text);
        },
        click: async (selector) => (await find(selector)).click(),
        text: async (selector) => (await find(selector)).getText(),
        waitForValue: (selector) =>
          waitFor(async () => String(await (await find(selector)).getProperty('value'))),
        reload: () => driver.navigate().refresh(),
      };
    },
    close: async () => {
      await driver.quit();
      fs.rmSync(out, { recursive: true, force: true });
    },
  };
}
