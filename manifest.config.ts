import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Personal Bookmark Dashboard',
  description:
    'Replaces the Chrome New Tab page with a dark grouped bookmark dashboard.',
  version: '0.1.0',
  permissions: ['storage', 'tabs'],
  action: {
    default_title: 'Open Personal Bookmark Dashboard',
  },
  commands: {
    'quick-save-current-page': {
      description: 'Quick save the current page to the dashboard',
    },
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  chrome_url_overrides: {
    newtab: 'index.html',
  },
})
