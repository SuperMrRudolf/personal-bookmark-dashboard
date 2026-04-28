# Chrome Web Store Listing Notes

## Privacy Policy

The Chrome Web Store Developer Dashboard requires a public privacy policy URL when an extension handles user data, even if that data is stored locally.

Use `PRIVACY.md` as the source privacy policy.

Suggested public URL options:

- GitHub file URL if the repository is public
- GitHub Pages page based on `PRIVACY.md`
- a page on the developer website

## Permission Justification

Use this wording in the Chrome Web Store permission/privacy fields where relevant:

`storage`

Used to save the user's bookmark dashboard data locally in Chrome, including groups, bookmarks, tags, order, and dashboard settings.

`tabs`

Used for user-facing tab actions: quick-saving the current active page to the dashboard and opening saved bookmarks in browser tabs.

## Data Usage Summary

The extension stores bookmark dashboard data locally in `chrome.storage.local`.

The extension does not sell, transfer, or share bookmark data with third parties.

The extension does not send saved bookmark data to a developer-owned server.

Some bookmark icons may load from the bookmarked site or a favicon service when a bundled local icon is not available.

## Pre-Submission Checks

- Run `npm run build`.
- Reload the unpacked `dist` extension in Chrome.
- Test first-run empty dashboard.
- Test quick-save current page.
- Test export/import backup.
- Test locked/unlocked layout behavior.
- Run `npm audit` and confirm it still reports 0 vulnerabilities.
