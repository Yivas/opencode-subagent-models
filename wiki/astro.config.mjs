import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://yivas.github.io',
  base: '/opencode-subagent-models',
  integrations: [
    starlight({
      title: 'Subagent Models',
      description: 'Global and per-session model selection for OpenCode subagents.',
      favicon: '/favicon.svg',
      customCss: ['./src/styles/custom.css'],
      editLink: {
        baseUrl: 'https://github.com/Yivas/opencode-subagent-models/edit/main/wiki/',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/Yivas/opencode-subagent-models',
        },
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Overview', link: '/' },
            { slug: 'getting-started/installation', label: 'Installation' },
            { slug: 'getting-started/quick-start', label: 'Quick start' },
          ],
        },
        {
          label: 'Guides',
          collapsed: true,
          items: [
            { slug: 'guides/global-selection', label: 'Global selection' },
            { slug: 'guides/session-selection', label: 'Session selection' },
            { slug: 'guides/troubleshooting', label: 'Troubleshooting' },
          ],
        },
        {
          label: 'Reference',
          collapsed: true,
          items: [
            { slug: 'reference/default-and-inheritance', label: 'Default and inheritance' },
            { slug: 'reference/stored-state', label: 'Stored state' },
            { slug: 'reference/compatibility', label: 'Compatibility' },
          ],
        },
        {
          label: 'Project',
          collapsed: true,
          items: [
            { slug: 'project/development', label: 'Local development' },
            { slug: 'project/contributing', label: 'Contributing' },
            { slug: 'project/security', label: 'Security' },
          ],
        },
      ],
      pagination: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      disable404Route: true,
    }),
  ],
});
