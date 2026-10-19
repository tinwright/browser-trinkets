/** Branding and curation for the catalog site. */
export default {
  title: 'browser-trinkets',
  tagline: 'Small extensions for Chrome and Firefox',
  intro: 'Each one does one job, asks for as little access as it can, and collects nothing.',
  languages: ['en', 'fr', 'es'],
  translations: {
    fr: {
      tagline: 'De petites extensions pour Chrome et Firefox',
      intro: 'Chacune fait une seule chose, demande le moins d’accès possible et ne collecte rien.',
    },
    es: {
      tagline: 'Pequeñas extensiones para Chrome y Firefox',
      intro: 'Cada una hace una sola cosa, pide el mínimo acceso posible y no recopila nada.',
    },
  },
  repoUrl: 'https://github.com/tinwright/browser-trinkets',
  siteUrl: 'https://tinwright.github.io/browser-trinkets',
  license: 'MIT',
  branch: 'main',
  itemsDir: 'extensions',
  items: {
    // The template's example: kept as a model for new tools and for the tests, but not listed.
    example: { hidden: true },
  },
};
