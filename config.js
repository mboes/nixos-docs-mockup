const config = {
  gatsby: {
    pathPrefix: '/',
    siteUrl: 'https://nixos.org',
    gaTrackingId: null,
    trailingSlash: false,
  },
  header: {
    logo: 'https://raw.githubusercontent.com/NixOS/nixos-artwork/master/logo/nix-snowflake.svg',
    logoLink: 'https://nixos.org/learn',
    title:
      "Nix user manual demo",
    githubUrl: 'https://github.com/mboes/nixos-docs-mockup',
    helpUrl: '',
    tweetText: '',
    links: [{ text: '', link: '' }],
    search: {
      enabled: true,
      indexName: 'nixos-docs',
      algoliaAppId: process.env.GATSBY_ALGOLIA_APP_ID,
      algoliaSearchKey: process.env.GATSBY_ALGOLIA_SEARCH_KEY,
      algoliaAdminKey: process.env.ALGOLIA_ADMIN_KEY,
    },
  },
  sidebar: {
    forcedNavOrder: [
      '/introduction', // add trailing slash if enabled above
      '/quickstart',
    ],
    collapsedNav: [
      '/codeblock', // add trailing slash if enabled above
    ],
    links: [{ text: 'Nix', link: 'https://nixos.org' }],
    frontline: false,
    ignoreIndex: true,
    title:
      "The Nix user manual demo",
  },
  siteMetadata: {
    title: 'Nix user manual demo',
    description: 'Documentation built with mdx.',
    ogImage: null,
    docsLocation: 'https://github.com/mboes/nixos-docs-mockup/tree/master/content',
    favicon: 'https://graphql-engine-cdn.hasura.io/img/hasura_icon_black.svg',
  },
  pwa: {
    enabled: false, // disabling this will also remove the existing service worker.
    manifest: {
      name: 'Gatsby Gitbook Starter',
      short_name: 'GitbookStarter',
      start_url: '/',
      background_color: '#6b37bf',
      theme_color: '#6b37bf',
      display: 'standalone',
      crossOrigin: 'use-credentials',
      icons: [
        {
          src: 'src/pwa-512.png',
          sizes: `512x512`,
          type: `image/png`,
        },
      ],
    },
  },
};

module.exports = config;
