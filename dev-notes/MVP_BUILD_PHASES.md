# MVP Build Plan

This is the practical build plan for the Personal Bookmark Dashboard Chrome Extension. It replaces the older phase order and should be treated as the working roadmap from this point forward.

## Product Summary

Build a local-first Chrome extension that replaces the New Tab page with a single-page, dark, LumiList-inspired bookmark dashboard.

Bookmarks are organized into named groups. The dashboard supports bookmark/group management, stable search and tag filtering, intentional drag-and-drop reordering, manual backup/restore, and a quick-save shortcut.

## Locked MVP Scope

- Chrome extension using Manifest V3
- New Tab override dashboard
- one single dashboard page only
- local storage only using `chrome.storage.local`
- no default Ungrouped group
- bookmark save requires a group
- typing a new group name while saving a bookmark creates that group
- group cards with compact bookmark rows
- bookmark rows show favicon plus one-line name
- add/edit/delete bookmarks
- add/rename/delete groups
- deleting a group deletes all bookmarks inside it after confirmation
- group-level `Open all` action
- text search by bookmark name and URL
- tag click filtering
- existing-tag picker in add/edit bookmark form
- filters hide bookmarks in place without collapsing layout
- lock/unlock toggle, locked by default
- lock only controls drag-and-drop/reordering
- drag-and-drop for groups and bookmarks
- export/import JSON backup
- import mode is replace-all only
- import creates groups from imported group names
- import uses/creates `Imported` only when a bookmark has no group information
- quick-save popup via keyboard command
- dark LumiList-inspired final visual polish

## Build Sequence

### 0. Project Setup - Complete

Goal: lock the project direction and create the working repo.

Completed:
- v1 scope and stack decisions are captured
- repo exists locally and on GitHub
- WSL/VS Code workflow is established
- project notes exist in `dev-notes/`
- open-source starter docs exist

### 1. Extension Shell - Complete

Goal: create a working Chrome extension shell.

Completed:
- Vite + React + TypeScript scaffold
- Manifest V3 config
- CRXJS integration
- New Tab override
- extension action opens the dashboard
- starter dark dashboard shell
- production build verified
- unpacked extension verified in Chrome

### 2. Storage And Data Model - Complete

Goal: make dashboard data persistent and reliable.

Completed:
- TypeScript models for settings, groups, bookmarks, and dashboard data
- storage wrapper around `chrome.storage.local`
- bootstrap starts with no groups
- storage normalization for missing/malformed data
- lock state persisted as dashboard data
- group CRUD helpers
- bookmark CRUD helpers
- bookmark save can create a new group from a typed group name
- legacy empty `Ungrouped` groups are removed during normalization
- legacy `Ungrouped` groups with bookmarks are preserved as `Imported`
- import-specific normalization is implemented for backup restore

### 3. Core Management UI - Complete

Goal: make bookmark and group management usable from the dashboard.

Completed:
- dashboard loads real stored data instead of mock data
- add group UI
- add bookmark UI
- bookmark edit UI
- bookmark delete with confirmation
- group rename UI
- group delete with confirmation
- deleting a group deletes contained bookmarks
- bookmark group field is required
- typing a new group name while adding/editing a bookmark creates/uses that group
- existing-tag picker in add/edit bookmark form
- group-level `Open all`
- top-level Add bookmark remains available even when no groups exist
- lock does not block add/edit/delete actions

Still to improve later:
- convert top-of-page forms into compact anchored popups
- improve form positioning and keyboard behavior
- refine confirmation copy and error states during polish

### 4. Search And Tag Filtering - Complete

Goal: support fast filtering without breaking spatial memory.

Completed:
- search by bookmark name and URL
- sidebar tag list from unique bookmark tags
- click-to-filter by tag
- hidden bookmarks preserve layout slot
- hidden bookmarks are non-interactive
- group cards remain visible while filtering

Polish candidates:
- clearer active filter reset
- empty-state messaging while filtered
- improved spacing and visual hierarchy

### 5. Core Dashboard Visual System - In Progress

Goal: make the dashboard feel intentional, compact, and close to the desired LumiList-inspired direction.

Current state:
- functional dark scaffold exists
- group cards, bookmark rows, toolbar, tags, and forms are present
- current look is not final

Still to do:
- redesign visual language after core behavior stabilizes
- compact bookmark rows further
- improve typography, spacing, hover states, and card treatment
- replace temporary top panels with small popups
- make desktop and mobile layouts feel deliberate
- improve favicon fallback visuals
- improve empty states

### 6. Drag-And-Drop And Locking - Complete

Goal: allow intentional layout changes while preventing accidental movement.

Rules:
- default state is locked
- locked state disables drag-and-drop/reordering only
- locked state does not block add/edit/delete/search/filter/open-all/import/export
- unlocked state enables reordering

Implementation slices:
- reorder groups while unlocked using sortable drag behavior - complete
- reorder bookmarks within the same group while unlocked - complete
- move bookmarks between groups while unlocked - complete
- persist every order change
- add a clear unlocked visual state

Completed:
- no dragging happens while locked
- groups reorder while unlocked
- bookmarks reorder within groups while unlocked
- bookmarks move between groups while unlocked
- all order changes persist after refresh/new tab
- group drag-and-drop is smooth and stable
- same-group bookmark drag-and-drop is smooth and stable
- cross-group bookmark drag-and-drop previews the target slot continuously and commits the previewed state on release
- dragging outside groups no longer crashes or loses data

Implementation note:
- `dnd-kit` is used for dragging.
- Cross-group bookmark movement is previewed from pointer position during drag movement.
- The final drop saves the already-previewed dashboard state instead of recomputing placement on release.
- Conflicting row transforms are suppressed only after a bookmark crosses into another group, so the visual slot and saved order stay aligned.

### 7. Export And Import Backup - Complete

Goal: support reliable manual backup/restore.

Export requirements:
- export settings
- export groups
- export bookmarks
- export ordering metadata
- export schema/version metadata

Import requirements:
- replace-all import only
- validate schema before replacing data
- confirm before overwrite
- reject invalid/corrupt JSON safely
- preserve imported group names
- create missing groups from imported group names
- use/create `Imported` only when a bookmark has no group information
- preserve imported tags
- trim, dedupe, and normalize imported tags

Done when:
- user can export a valid JSON backup
- user can import a valid JSON backup
- invalid imports fail safely
- imported group names and tags are preserved

Status:
- implementation complete
- user-tested in Chrome, except deliberately broken/non-JSON import was skipped for now

### 8. Quick Save Shortcut - Complete

Goal: save the current page quickly from anywhere in Chrome.

Requirements:
- add keyboard command in manifest
- use a safe default shortcut only if Chrome allows it
- allow user remapping via `chrome://extensions/shortcuts`
- command opens quick-save popup
- popup prefills current page title and URL
- group is required before saving
- user can type an existing or new group name
- tags default empty
- save creates bookmark in storage
- cancel closes without saving

Done when:
- shortcut triggers quick-save
- title and URL prefill correctly
- bookmark saves to selected/created group
- shortcut can be remapped if needed

Status:
- implementation complete
- user-tested in Chrome

### 9. Polish And Hardening

Goal: make the extension feel finished and safe for daily use.

Polish:
- final LumiList-inspired visual pass
- compact anchored popups
- improved motion/hover/focus states
- better empty states
- better tag/filter reset states
- improved responsive layout

Hardening:
- test larger bookmark counts
- test empty groups
- test duplicate URLs
- test invalid URLs
- test broken favicon URLs
- test invalid import files
- review dependency audit warning for Rollup advisory `GHSA-mw96-cpmx-2vgc` through `@crxjs/vite-plugin`
- update build tooling carefully instead of running `npm audit fix --force` casually
- improve accessibility labels, focus states, and contrast
- clean up code structure and comments
- update README with install/build/use instructions

## Current Recommended Next Step

Continue with **9. Polish And Hardening**.

Recommended order inside polish:
1. UI/visual polish in small slices so drag behavior stays stable.
2. Convert add/edit flows from top-of-page panels to compact popups.
3. Run larger-dataset and edge-case testing.
4. Expand README with install, build, usage, backup, and shortcut instructions.
- hardening/dependency maintenance
