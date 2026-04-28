# Personal Bookmark Dashboard - Build Checkpoint

## Current phase
Phase 9 - Polish and hardening in progress

## What is already finished
- Initial build direction is defined
- v1 product decisions are locked
- stack plan is chosen
- working environment notes are captured
- open-source starter files are added
- extension scaffold is created
- Manifest V3 config is added
- React + TypeScript + Vite shell is added
- CRXJS integration is added
- new tab override is configured
- toolbar action opens the dashboard in a tab
- starter dark dashboard UI is in place
- dashboard data model is defined for settings, groups, and bookmarks
- storage wrapper is in place for full dashboard data in `chrome.storage.local`
- default bootstrap starts with no groups
- storage normalization guards against missing or malformed data
- lock toggle is persisted as part of dashboard data
- lock/unlock controls layout movement and edit affordances; edit group/bookmark controls are hidden while locked
- dashboard now loads groups and bookmarks from storage instead of mock data
- starter search and tag filter shell works against stored bookmarks
- tag filtering supports selecting multiple tags at once with an All/Any match toggle; `All tags` clears the selected tag filters
- storage helper functions exist for group create/update/delete
- storage helper functions exist for bookmark create/update/delete
- deleting a group also deletes all bookmarks inside it after confirmation
- Add group UI is wired to persistent storage
- Add bookmark UI is wired to persistent storage
- bookmark edit UI is wired to persistent storage
- bookmark delete UI is wired with confirmation
- group rename UI is wired to persistent storage
- group delete UI is wired with confirmation
- bookmark save requires a group name
- typing a new group name while saving a bookmark creates that group
- legacy empty `Ungrouped` groups are removed during storage normalization
- group-level `Open all` action is wired for groups with bookmarks
- existing-tag picker is wired in the add/edit bookmark form
- group drag-and-drop reorder uses sortable drag behavior while unlocked
- bookmark drag-and-drop reorder within the same group uses sortable drag behavior while unlocked
- bookmark drag-and-drop move between groups uses sortable drag behavior while unlocked
- drag-and-drop release behavior now commits the previewed dashboard state instead of recomputing placement on drop
- group drag, same-group bookmark drag, and cross-group bookmark drag have been user-tested as working smoothly
- group drag-and-drop is disabled while locked
- export JSON backup is wired from the dashboard
- import JSON backup is wired from the dashboard with replace-all confirmation
- backup import creates missing groups from bookmark group names
- backup import uses/creates `Imported` only when a bookmark has no group info
- backup import preserves tags and ordering
- manifest command for quick-save is wired
- background worker captures the current tab for quick-save
- quick-save opens the dashboard with a prefilled bookmark form
- quick-save requires group selection before saving
- extension icon assets are present and referenced by the manifest
- temporary drag-and-drop research notes were removed after the issue was fixed
- add/edit group and bookmark forms now open as compact popup-style overlays instead of pushing the dashboard down
- dashboard typography now uses bundled local `Outfit` font files instead of a runtime Google Fonts dependency
- dashboard ships with a mixed local icon system: official Google Workspace assets where available, bundled local icons for many common services, and favicon fallback for uncatalogued sites
- broken bundled icon files that were actually saved HTML/JS responses were removed so affected services fall back cleanly instead of showing broken mapped assets
- local icon notes were cleaned up and renamed to `dev-notes/ICON_LIBRARY_STATUS.md`
- privacy policy and Chrome Web Store listing notes are documented for release prep
- deleted bookmarks and groups can be restored from a small undo toast immediately after deletion
- search/tag sidebar can be toggled from a small right-side icon and scrolls independently when tag lists are long
- top nav no longer shows a title; the lock/unlock switch sits on the left, with add/menu actions on the right
- sidebar now opens from the right side, with the search toggle aligned to that right-side control area
- top-right action menu now closes automatically when clicking away
- lock/unlock label now appears before the switch track for the final preferred nav layout
- dependency audit currently reports 0 vulnerabilities after a scoped Rollup override for CRXJS
- production build is verified
- unpacked extension loads successfully in Chrome
- opening a new tab shows the dashboard
- clicking the extension icon opens the dashboard

## Exact stack decisions
- Chrome extension, Manifest V3
- React
- TypeScript
- Vite
- @crxjs/vite-plugin
- chrome.storage.local
- New tab override dashboard
- one single dashboard page only
- dark LumiList-inspired UI
- group cards on a fixed page layout
- bookmark rows with favicon + one-line name
- add/edit/delete bookmarks
- add/rename/delete groups
- drag-and-drop for groups and bookmarks
- lock/unlock toggle, locked by default
- text search by name + URL
- tag click filter
- filters hide items in place without collapsing layout
- quick-save popup via keyboard command
- export/import JSON backup
- local storage only
- no default Ungrouped group
- bookmark save requires a group
- typing a new group name while saving a bookmark creates that group
- import mode = replace all only

## Folder structure
```text
dev-notes/
  BUILD_CHECKPOINT.md
  ICON_LIBRARY_STATUS.md
  MVP_BUILD_PHASES.md
  PRD.md
  STORE_LISTING_NOTES.md

LICENSE
PRIVACY.md
README.md
index.html
manifest.config.ts
package.json
tsconfig.json
vite.config.ts

src/
  background.ts
  dashboard/
  lib/
```

## What Codex generated
- This checkpoint file at `dev-notes/BUILD_CHECKPOINT.md`
- Root `README.md`
- Root `LICENSE`
- Vite + React + TypeScript scaffold files
- Manifest V3 extension config
- Background action handler
- Dashboard shell UI and storage helper

## What still needs doing
- refine the LumiList-inspired visual design
- refine compact popup placement, focus behavior, and visual polish
- replace remaining fallback/runtime icons with better local official assets where possible
- run a final larger-dataset drag/search/import/export pass
- expand the README further once feature-level setup and usage details exist

## Notes
- Working inside WSL Ubuntu
- Using VS Code + Codex
- Dependency audit note: the previous CRXJS/Rollup advisory was resolved with an npm override that pins CRXJS's internal Rollup dependency to `2.80.0`; `npm audit` currently reports 0 vulnerabilities.
- Drag-and-drop implementation note: the working approach uses `dnd-kit`, previews cross-group bookmark movement during drag movement, suppresses conflicting row transforms after crossing groups, and saves the already-previewed state on release.
