import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(
  defineConfig({
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
          {
            text: 'Guides',
            items: [
              { text: 'Contracts', link: '/guide/contracts' },
              { text: 'Router Configuration', link: '/guide/router-configuration' },
              { text: 'Validation', link: '/guide/validation' },
              { text: 'Type Safety', link: '/guide/type-safety' },
              { text: 'Content Types', link: '/guide/content-types' },
              { text: 'Middleware', link: '/guide/middleware' },
              { text: 'Error Handling', link: '/guide/error-handling' },
              { text: 'OpenAPI Integration', link: '/guide/openapi' },
              { text: 'Schema Libraries', link: '/guide/schema-libraries' },
              { text: 'Best Practices', link: '/guide/best-practices' },
              { text: 'Advanced Patterns', link: '/guide/advanced-patterns' },
            ],
          },
          {
            text: 'Additional',
            items: [
              { text: 'Migration Guide', link: '/guide/migration' },
              { text: 'Troubleshooting', link: '/guide/troubleshooting' },
              { text: 'FAQ', link: '/guide/faq' },
            ],
          },
        ],
        '/api/': [
          {
            text: 'API Reference',
            items: [
              { text: 'Overview', link: '/api/' },
              { text: 'createContract', link: '/api/create-contract' },
              { text: 'createRouter', link: '/api/create-router' },
              { text: 'createOpenApiSpecification', link: '/api/create-openapi-specification' },
              { text: 'Types', link: '/api/types' },
              { text: 'Middleware API', link: '/api/middleware-api' },
            ],
          },
        ],
        '/examples/': [
          {
            text: 'Examples',
            items: [
              { text: 'Overview', link: '/examples/' },
              { text: 'Simple Example', link: '/examples/simple' },
              { text: 'Complex Example', link: '/examples/complex' },
              { text: 'Valibot Example', link: '/examples/valibot' },
              { text: 'Content Types', link: '/examples/content-types' },
              { text: 'Authentication', link: '/examples/authentication' },
              { text: 'File Upload', link: '/examples/file-upload' },
            ],
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
  })
);
