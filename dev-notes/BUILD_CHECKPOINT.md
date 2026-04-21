# Personal Bookmark Dashboard - Build Checkpoint

## Current phase
Phase 1 - Setup and scaffold complete, Chrome extension shell verified

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
- lock toggle is persisted with `chrome.storage.local`
- starter search and tag filter shell is working on mock data
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
- default group = Ungrouped
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
- Add bookmark and group CRUD flows
- Add drag-and-drop for groups and bookmarks
- replace mock data with real bookmark and group state
- extend the lock/unlock behavior to editing and drag interactions
- Build quick-save popup and keyboard command
- Implement JSON export/import with replace-all behavior
- Wire persistence through `chrome.storage.local`
- expand the README further once feature-level setup and usage details exist

## Notes
- Working inside WSL Ubuntu
- Using VS Code + Codex
