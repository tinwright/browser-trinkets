# browser-trinkets

Small extensions for Chrome and Firefox, free to use and adapt. Part of
[tinwright](https://github.com/tinwright).

| Extension | What it is | Browsers |
|---|---|---|
| [**example**](extensions/example) | A note that waits in your toolbar. | Chrome, Firefox |

Every extension has a page on the [catalog site](https://tinwright.github.io/browser-trinkets), in
English, French and Spanish, with its install buttons.

## Install

- **Firefox:** click **Add to Firefox** on the extension's page. The `.xpi` is signed by Mozilla,
  and Firefox keeps it up to date.
- **Chrome:** download the zip from the extension's page and unzip it. Open `chrome://extensions`,
  turn on **Developer mode**, click **Load unpacked** and choose the folder. (The Chrome Web Store
  comes later.)

## Make one

```sh
npm install
npx playwright install chromium   # once, for the Chrome tests
npm run create -- my-extension --description "What it does, in one sentence."
npm run check   # this workshop's rules, web-ext lint, and a scan for secrets
npm test        # the site, and every extension in real Chrome and Firefox
npm run dev     # the catalog site at http://localhost:3000
```

[`CLAUDE.md`](CLAUDE.md) is the full guide, written so Claude can follow it too.

## Licence

[MIT](LICENSE)
