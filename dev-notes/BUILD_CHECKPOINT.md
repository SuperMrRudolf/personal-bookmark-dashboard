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
- lock/unlock is scoped to layout movement only; add/edit/delete actions remain available while locked
- dashboard now loads groups and bookmarks from storage instead of mock data
- starter search and tag filter shell works against stored bookmarks
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
  MVP_BUILD_PHASES.md
  PRD.md

LICENSE
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
- convert top-of-page add/edit forms into compact popups/anchored panels
- run a final larger-dataset drag/search/import/export pass
- review dependency audit warning before release: `npm audit` currently reports high-severity Rollup advisory `GHSA-mw96-cpmx-2vgc` through `@crxjs/vite-plugin`; do not use `npm audit fix --force` casually because npm marks the available fix as a breaking CRXJS change
- expand the README further once feature-level setup and usage details exist

## Notes
- Working inside WSL Ubuntu
- Using VS Code + Codex
- Dependency audit note from 2026-04-23: the current warning affects local build tooling, not dashboard runtime code, but should be revisited during hardening/dependency maintenance.
- Drag-and-drop implementation note: the working approach uses `dnd-kit`, previews cross-group bookmark movement during drag movement, suppresses conflicting row transforms after crossing groups, and saves the already-previewed state on release.
