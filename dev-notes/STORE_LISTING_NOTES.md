# Chrome Web Store Listing Notes

## Privacy Policy

The Chrome Web Store Developer Dashboard requires a public privacy policy URL when an extension handles user data, even if that data is stored locally.

Use `PRIVACY.md` as the source privacy policy.

Suggested public URL options:

- GitHub file URL if the repository is public
- GitHub Pages page based on `PRIVACY.md`
- a page on the developer website

Current submission note:

- the Chrome Web Store submission used the public GitHub URL for `PRIVACY.md`

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

Some bookmark icons may load from Google's favicon service when a bundled local icon is not available.

## Pre-Submission Checks

- Run `npm run build`.
- Do not run `npm run store:assets` over the real screenshots unless placeholder assets are intentionally being regenerated.
- Run `npm run store:package`.
- Reload the unpacked `dist` extension in Chrome. Done on `2026-04-29`.
- Test first-run empty dashboard. Done on `2026-04-29`.
- Test quick-save current page. Done on `2026-04-29`.
- Test export/import backup. Done on `2026-04-29`.
- Test locked/unlocked layout behavior. Done on `2026-04-29`.
- Run `npm audit` and confirm it still reports 0 vulnerabilities.

## Store Listing Assets

Final store assets live in `store-listing/assets`:

- `icon-128.png`
- `dashboard-screenshot.png`
- `grid_edit_view_screenshot.png`
- `small-promo-tile.png`
- `marquee_promo.png`

Current asset check:

- screenshots are real project screenshots
- `icon-128.png` is correctly 128x128
- `marquee_promo.png` is correctly 1400x560
- `small-promo-tile.png` is correctly 440x280

The upload package is generated at `release/personal-bookmark-dashboard-0.1.0.zip`.

## Dashboard Field Copy

Short description:

`Replace your Chrome New Tab page with a local grouped bookmark dashboard.`

Single purpose:

`Replace the Chrome New Tab page with a local grouped bookmark dashboard.`

Remote code declaration:

`No remotely executed code.`

## Donation Link

The optional donation/support page is now live:

`https://personal-bookmark-dashboard.pages.dev/donate`

Use this approach:

- keep the extension fully usable without donating
- label the link as optional support, not a required purchase
- open the landing/donation page only from a user action
- mention the donation link in the store listing only if you want it visible in the public description
- do not mark the extension as paid unless features are actually gated behind payment

## Immediate Submission Sequence

Use this order for the Chrome Web Store submission:

1. Host the privacy policy at a public URL and confirm the final page is reachable outside the repo.
2. Run the final pre-submission checks above.
3. Run `npm run store:package`.
4. Upload `release/personal-bookmark-dashboard-0.1.0.zip` in the Chrome Web Store Developer Dashboard.
5. Fill in the listing fields using `store-listing/README.md`, the asset files in `store-listing/assets`, and the permission/data wording from this file.
6. Submit for review.

## Submission Status

- submitted to the Chrome Web Store on `2026-04-29`
- current state: waiting for review
