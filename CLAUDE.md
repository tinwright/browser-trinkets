# browser-trinkets

Extensions for Chrome and Firefox, one folder each under `extensions/`, each loading in both
browsers from the same files, with a catalog site built from their READMEs. This file has two
halves: helping someone install an extension, and building a new one.

## Helping someone install an extension

Assume the person has never installed an extension by hand. One step at a time, and wait for each
to work before the next.

**Firefox** (the easy one):

1. Open the extension's page on https://tinwright.github.io/browser-trinkets and click
   **Add to Firefox**.
2. Firefox asks whether to add it, and lists what it may access: click **Add**.
3. It's installed, and Firefox updates it by itself from then on.

**Chrome:**

1. On the same page, click **Download for Chrome**. Open the downloaded zip so it unzips into a
   folder, and move that folder somewhere it can stay (Documents, say). Chrome loads it from there,
   so deleting the folder removes the extension.
2. Type `chrome://extensions` in the address bar and press Enter.
3. Turn on **Developer mode**, top right.
4. Click **Load unpacked** and choose the folder from step 1.
5. Pin it: click the puzzle-piece icon in the toolbar, then the pin next to the extension.

Chrome doesn't update an extension loaded this way. For a new version, download it again, replace
the folder, and click the reload arrow on the extension's card in `chrome://extensions`.

## Building an extension

### Start

```sh
npm run create -- <name> --description "What it does, in one sentence."
```

This copies `template/` to `extensions/<name>/`: a popup, a background script, a manifest and a
test, ready to load in both browsers. The name is lowercase with hyphens.

### One manifest for both browsers

- `background` names the same file twice: `"service_worker"` for Chrome, `"scripts"` for Firefox.
  Write it as a service worker: no DOM, and nothing kept in variables between events. Use
  `chrome.storage` for anything that must last.
- `browser_specific_settings.gecko`: `id` is `<name>@tinwright` and can never change, since Firefox
  uses it for signing and updates. `data_collection_permissions` is `{ "required": ["none"] }`, and
  `update_url` is the extension's `updates.json` on the catalog site, which the site build writes.
- Call `chrome.*` everywhere. Firefox supports it, and both return promises in Manifest V3.
- Permissions: the fewest that work. Host access goes in `optional_host_permissions`, asked for
  with `chrome.permissions.request` when the person first needs it, or use `activeTab`. `npm run
  check` refuses `host_permissions` and content scripts on `<all_urls>`.
- No remote code: no scripts from other sites, no `eval`, no `new Function`. Both stores refuse it.
- Chrome-only features (side panel, offscreen documents, declarativeContent, tab groups): mark the
  extension Chrome-only with an `item.json` of `{ "browsers": ["chrome"] }`, and its Firefox
  checks and tests are skipped. A side panel can have a Firefox `sidebar_action` alongside instead.

### Tests

Each extension's `*.test.mjs` runs in a real Chrome (Playwright, the folder loaded unpacked) and a
real Firefox (geckodriver, the packaged zip as a temporary add-on), through the small interface in
`test/browsers.mjs`: `open(file)`, then `fill`, `click`, `text`, `waitForValue` and `reload`. Write
each test once; `browsersFor(name)` loops it over the extension's browsers. Add to the interface
when a test needs more, in both halves. `BROWSERS=chrome npm test` runs just one browser.

### Before a pull request

```sh
npm run check   # manifest rules, web-ext lint, READMEs, tests, template leftovers, secrets
npm test        # every extension in both browsers
```

CI runs both, and the private-data guard, which fails on company hosts, internal IDs and work
email addresses anywhere in the change or its commits. Use `example.com` in examples and tests.

Commit messages are conventional commits scoped to the extension: `feat(example): clear button`.

### Releasing

Bump `version` in the manifest, merge, then tag `<name>@<version>` (`example@0.2.0`) on `main` and
push the tag. The release workflow builds the Chrome zip, has Mozilla sign the Firefox copy
(`web-ext sign --channel unlisted`, using the `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` secrets), and
attaches both to a GitHub release with notes from the commits. The next site build points
`updates.json` at the new `.xpi`, and Firefox installs update themselves.

For the stores later: the Chrome Web Store takes the same zip. A public addons.mozilla.org listing
(`--channel listed`) needs `update_url` removed, since AMO updates listed extensions itself.

### Site

The catalog site at https://tinwright.github.io/browser-trinkets is built by `tinwright.github.io` from a
checkout of this repo, hourly and on demand; nothing here builds or deploys it. The install
buttons and facts come from `scripts/site.mjs`, fed by each manifest (version, permissions) and
`item.json` (browsers), and `scripts/rules.mjs` `afterBuild` writes each `updates.json`. To see it,
run `npm run dev` in `tinwright.github.io`, cloned next to this repo; its `npm test` checks every
page and link.
