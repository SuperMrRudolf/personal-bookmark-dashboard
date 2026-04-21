# Personal Bookmark Dashboard - Build Checkpoint

## Current phase
Phase 1 - Project scaffolding and extension shell

## What is already finished
- Initial build direction is defined
- v1 product decisions are locked
- stack plan is chosen
- working environment notes are captured

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
project-notes/
  BUILD_CHECKPOINT.md
  MVP_BUILD_PHASES.md
  PRD.md
```

## What Codex generated
- This checkpoint file at `project-notes/BUILD_CHECKPOINT.md`

## What still needs doing
- Scaffold the Chrome extension project
- Configure Manifest V3 with new tab override
- Set up React + TypeScript + Vite + `@crxjs/vite-plugin`
- Build the single dashboard page shell
- Implement dark LumiList-inspired UI
- Add bookmark and group CRUD flows
- Add drag-and-drop for groups and bookmarks
- Implement lock/unlock behavior
- Add search and tag-based filtering
- Build quick-save popup and keyboard command
- Implement JSON export/import with replace-all behavior
- Wire persistence through `chrome.storage.local`

## Notes
- Working inside WSL Ubuntu
- Using VS Code + Codex
