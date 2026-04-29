# Personal Bookmark Dashboard

A Chrome extension that replaces the New Tab page with a clean, dark, grouped bookmark dashboard inspired by LumiList.

## Features
- Chrome New Tab replacement with a single local dashboard
- Grouped bookmark columns with compact favicon-first rows
- Add, edit, delete, rename, and organize bookmarks and groups
- `Open all` action for launching every bookmark in a group
- Lock/unlock layout mode to prevent accidental reordering
- Drag-and-drop group ordering and bookmark ordering while unlocked
- Cross-group bookmark moves with stable saved order
- Grid edit view for faster inline bookmark name, URL, tag, and delete edits
- Existing-tag picker plus comma-separated tag entry
- Search by bookmark name and URL
- Multi-select tag filtering with All/Any match modes
- Toggleable, resizable search/tag sidebar with persisted width
- Quick-save shortcut that captures the current tab title and URL
- JSON backup export and replace-all restore/import
- Undo toast after deleting bookmarks or groups
- Local-first storage using `chrome.storage.local`
- Bundled local font files and many local app icons, with favicon fallback

## Status
Feature-complete for v1.

An optional donation/support page is now live at `https://personal-bookmark-dashboard.pages.dev/donate`, and the extension links to it from the dashboard menu. The next step is Chrome Web Store submission.

## Tech
- React
- TypeScript
- Vite
- Chrome Extension (Manifest V3)
- CRXJS Vite Plugin

## Getting Started
```bash
npm install
npm run dev
```

Then load the unpacked extension from the generated dev output in Chrome while developing, or build a production bundle with:

```bash
npm run build
```

## Chrome Web Store Prep

```bash
npm run store:package
```

This builds the extension and creates:

```text
release/personal-bookmark-dashboard-0.1.0.zip
```

Use `store-listing/README.md` for listing copy, privacy declarations, permission justifications, and asset requirements.

Do not run `npm run store:assets` after replacing the generated placeholders with real screenshots unless you intentionally want to regenerate placeholder assets.

## Links
- Website: https://designlabs.co.za/
- Author: Rudolf Dutoit Enever
- Privacy Policy: [PRIVACY.md](./PRIVACY.md)
