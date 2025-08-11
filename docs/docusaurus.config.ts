import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'ImportCSV',
  tagline: 'CSV import solution for web applications',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://docs.importcsv.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'abhishekray07', // Usually your GitHub org/user name.
  projectName: 'importcsv', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Edit URL for GitHub repository
          editUrl:
            'https://github.com/abhishekray07/importcsv/tree/main/docs/',
          // Set the docs as the default route
          routeBasePath: '/',
          // Set the homepage to be the intro doc
          homePageId: 'intro',
        },
        blog: false, // Disable the blog feature
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/importcsv-social-card.jpg',
    navbar: {
      title: 'ImportCSV',
      logo: {
        alt: 'ImportCSV Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'dropdown',
          label: 'API Reference',
          position: 'left',
          items: [
            {
              label: 'Backend API',
              to: '/docs/api/backend',
            },
            {
              label: 'Frontend SDK',
              to: '/docs/api/frontend',
            },
          ],
        },
        {
          href: 'https://github.com/abhishekray07/importcsv',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'Backend',
              to: '/docs/backend/overview',
            },
            {
              label: 'Frontend',
              to: '/docs/frontend/overview',
            },
            {
              label: 'Admin',
              to: '/docs/admin/overview',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'API Reference',
              to: '/docs/api/backend',
            },
            {
              label: 'Examples',
              to: '/docs/examples',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/abhishekray07/importcsv',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ImportCSV. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
