import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'itty-spec',
  description: 'Contract-first, type-safe API definitions for itty-router',
  base: '/itty-spec/',
  lastUpdated: true,
  ignoreDeadLinks: true,
  cleanUrls: true,
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/core-concepts' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [{ text: 'Overview', link: '/api/' }],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [{ text: 'Overview', link: '/examples/' }],
        },
      ],
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/robertpitt/itty-spec',
      },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024',
    },
  },
});
