# Chrome Web Store Submission Kit

Assets and copy for publishing Personal Bookmark Dashboard.

## Files

- `assets/icon-128.png`: store icon copied from the extension icon.
- `assets/dashboard-screenshot.png`: real dashboard screenshot.
- `assets/grid_edit_view_screenshot.png`: real grid edit view screenshot.
- `assets/small-promo-tile.png`: 440x280 required small promotional image.
- `assets/marquee_promo.png`: 1400x560 optional marquee promotional image.
- `privacy.html`: public privacy policy source. Publish this via GitHub Pages, a public repo page, or your website before submitting.

Current asset status: all required listing asset dimensions are in place.

## Store Listing Copy

Short description:

```text
Replace your Chrome New Tab page with a local grouped bookmark dashboard.
```

Single purpose:

```text
Replace the Chrome New Tab page with a local grouped bookmark dashboard.
```

Detailed description:

```text
Personal Bookmark Dashboard turns every new tab into a clean, dark bookmark dashboard built for fast access and calm organization.

Create groups, save links, add tags, search across your dashboard, drag bookmarks into the right order, lock the layout when it is set, and export or import a JSON backup when you want a portable copy.

Your dashboard data is stored locally in Chrome using chrome.storage.local. The extension does not send saved bookmark data to a developer-owned server and does not sell, transfer, or share bookmark data with third parties.

An optional support/donation link may be included to help fund development. The extension remains usable without donating.
```

## Permission Justifications

`storage`

Used to save the user's bookmark dashboard data locally in Chrome, including groups, bookmarks, tags, order, and dashboard settings.

`tabs`

Used for user-facing tab actions: quick-saving the current active page to the dashboard and opening saved bookmarks in browser tabs.

## Privacy Declarations

- Data collected/stored: bookmark names, bookmark URLs, bookmark groups, bookmark tags, dashboard layout order, lock/unlock setting, and temporary quick-save draft data.
- Storage location: locally in `chrome.storage.local`.
- Data sale/sharing: no sale, no transfer, no sharing with third parties.
- Server transfer: saved bookmark data is not sent to a developer-owned server.
- Remote code: no remotely executed code.
- Network note: some bookmark favicons may load from Google's favicon service when no bundled local icon is available.

## Packaging

Run:

```bash
npm run store:package
```

Do not run `npm run store:assets` after replacing placeholder assets with real screenshots. That script is only for regenerating placeholder assets.

Upload:

```text
release/personal-bookmark-dashboard-0.1.0.zip
```

The ZIP contains the contents of `dist/`, so `manifest.json` is at the ZIP root.
