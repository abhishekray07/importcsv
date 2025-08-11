import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Backend',
      items: [
        'backend/overview',
      ],
    },
    {
      type: 'category',
      label: 'Frontend',
      items: [
        'frontend/overview',
      ],
    },
    {
      type: 'category',
      label: 'Admin Dashboard',
      items: [
        'admin/overview',
        'admin/features',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/backend',
        'api/frontend',
      ],
    },
    {
      type: 'doc',
      id: 'examples',
      label: 'Examples',
    },
  ],
};

export default sidebars;
