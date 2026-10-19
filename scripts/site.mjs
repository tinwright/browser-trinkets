// This workshop's part of the tinwright site, which tinwright.github.io builds from a checkout of
// this repo: its nouns, its own words, and what its pages add to the shell there. Each hook gets
// the site, the tool, where the page sits (ctx) and the site's helpers (kit), and returns HTML;
// escape anything that comes from the repo with kit.escapeHTML().

/**
 * @typedef {import('./items.mjs').Item} Item
 * @typedef {import('./items.mjs').SiteConfig} Site
 * @typedef {{ lang: string, root: string, home: string }} Ctx
 * @typedef {{
 *   escapeHTML: (text: string) => string,
 *   commandHTML: (lang: string, command: string) => string,
 *   itemsPath: (site: Site) => string,
 * }} Kit
 */

/** The nouns on this workshop's pages, per language. */
export const nouns = {
  en: {
    item: 'Extension',
    allItems: 'All extensions',
    count: (/** @type {number} */ n) => `${n} ${n === 1 ? 'extension' : 'extensions'}`,
    emptyTitle: 'No extensions yet',
    emptyText: 'The first ones are on their way. Watch the repository on GitHub to hear when they land.',
    back: '← All extensions',
    moreItems: 'More extensions',
  },
  fr: {
    item: 'Extension',
    allItems: 'Toutes les extensions',
    count: (/** @type {number} */ n) => `${n} ${n === 1 ? 'extension' : 'extensions'}`,
    emptyTitle: 'Pas encore d’extensions',
    emptyText: 'Les premières arrivent bientôt. Suivez le dépôt sur GitHub pour savoir quand elles seront là.',
    back: '← Toutes les extensions',
    moreItems: 'Autres extensions',
  },
  es: {
    item: 'Extensión',
    allItems: 'Todas las extensiones',
    count: (/** @type {number} */ n) => `${n} ${n === 1 ? 'extensión' : 'extensiones'}`,
    emptyTitle: 'Todavía no hay extensiones',
    emptyText: 'Las primeras están en camino. Sigue el repositorio en GitHub para enterarte cuando lleguen.',
    back: '← Todas las extensiones',
    moreItems: 'Más extensiones',
  },
};

const RELEASES = 'https://github.com/tinwright/browser-trinkets/releases/download';

/** This workshop's own words, per language. */
const WORDS = {
  en: {
    version: 'Version',
    permissions: 'Permissions',
    none: 'None',
    browsers: 'Browsers',
    firefox: 'Add to Firefox',
    firefoxHint: 'Firefox asks you to confirm, then it updates itself.',
    chrome: 'Download for Chrome',
    chromeSteps: [
      'Unzip the download.',
      'Open <code>chrome://extensions</code> and turn on <strong>Developer mode</strong>.',
      'Click <strong>Load unpacked</strong> and choose the unzipped folder.',
    ],
  },
  fr: {
    version: 'Version',
    permissions: 'Autorisations',
    none: 'Aucune',
    browsers: 'Navigateurs',
    firefox: 'Ajouter à Firefox',
    firefoxHint: 'Firefox vous demande de confirmer, puis se charge des mises à jour.',
    chrome: 'Télécharger pour Chrome',
    chromeSteps: [
      'Décompressez le fichier téléchargé.',
      'Ouvrez <code>chrome://extensions</code> et activez le <strong>Mode développeur</strong>.',
      'Cliquez sur <strong>Charger l’extension non empaquetée</strong> et choisissez le dossier décompressé.',
    ],
  },
  es: {
    version: 'Versión',
    permissions: 'Permisos',
    none: 'Ninguno',
    browsers: 'Navegadores',
    firefox: 'Añadir a Firefox',
    firefoxHint: 'Firefox te pide que lo confirmes y después se actualiza solo.',
    chrome: 'Descargar para Chrome',
    chromeSteps: [
      'Descomprime el archivo descargado.',
      'Abre <code>chrome://extensions</code> y activa el <strong>Modo de desarrollador</strong>.',
      'Haz clic en <strong>Cargar descomprimida</strong> y elige la carpeta descomprimida.',
    ],
  },
};
/** @param {string} lang */
const wordsOf = (lang) => WORDS[/** @type {keyof typeof WORDS} */ (lang)] ?? WORDS.en;

const BROWSER_NAMES = /** @type {Record<string, string>} */ ({ chrome: 'Chrome', firefox: 'Firefox' });

/**
 * A release download, as the release workflow names it.
 * @param {Item} item
 * @param {'chrome.zip' | 'firefox.xpi'} kind
 */
const download = (item, kind) =>
  `${RELEASES}/${encodeURIComponent(`${item.name}@${item.version}`)}/${item.name}-${item.version}-${kind}`;

/**
 * The extension's version, permissions and browsers.
 * @param {Site} site
 * @param {Item} item
 * @param {Ctx} ctx
 * @param {Kit} kit
 */
export function facts(site, item, ctx, kit) {
  const words = wordsOf(ctx.lang);
  const permissions = item.permissions.length
    ? item.permissions.map((permission) => `<code>${kit.escapeHTML(permission)}</code>`).join(', ')
    : words.none;
  return `${item.version ? `<dt>${words.version}</dt><dd>${kit.escapeHTML(item.version)}</dd>` : ''}
            <dt>${words.permissions}</dt><dd>${permissions}</dd>
            <dt>${words.browsers}</dt><dd>${item.browsers.map((browser) => BROWSER_NAMES[browser] ?? browser).join(', ')}</dd>`;
}

/**
 * Install buttons: Firefox's signed .xpi in one click, and Chrome's zip with its three steps.
 * @param {Site} site
 * @param {Item} item
 * @param {Ctx} ctx
 * @param {Kit} kit
 */
export function install(site, item, ctx, kit) {
  if (!item.version) return '';
  const words = wordsOf(ctx.lang);
  const firefox = item.browsers.includes('firefox')
    ? `<p><a class="button" href="${kit.escapeHTML(download(item, 'firefox.xpi'))}">${words.firefox}</a></p>
              <p class="hint">${words.firefoxHint}</p>`
    : '';
  const chrome = item.browsers.includes('chrome')
    ? `<p><a class="button button-secondary" href="${kit.escapeHTML(download(item, 'chrome.zip'))}">${words.chrome}</a></p>
              <ol class="steps">${words.chromeSteps.map((step) => `<li>${step}</li>`).join('')}</ol>`
    : '';
  return `<div class="install">
              ${firefox}
              ${chrome}
            </div>`;
}

/** The label above an extension's title: the browsers it runs in. @param {Item} item */
export const kicker = (item) => item.browsers.map((browser) => BROWSER_NAMES[browser] ?? browser).join(' · ');
