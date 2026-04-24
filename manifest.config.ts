import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Personal Bookmark Dashboard',
  description:
    'Replaces the Chrome New Tab page with a dark grouped bookmark dashboard.',
  version: '0.1.0',
  icons: {
    16: 'icons/Icon16.png',
    32: 'icons/Icon32.png',
    48: 'icons/Icon48.png',
    128: 'icons/Icon128.png',
  },
  permissions: ['storage', 'tabs'],
  action: {
    default_title: 'Open Personal Bookmark Dashboard',
    default_icon: {
      16: 'icons/Icon16.png',
      32: 'icons/Icon32.png',
      48: 'icons/Icon48.png',
    },
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
