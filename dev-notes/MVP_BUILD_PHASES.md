# MVP Build Phases

This file breaks the Personal Bookmark Dashboard Chrome Extension into practical build phases for MVP delivery.

## Project Summary

Build a Chrome extension that replaces the New Tab page with a dark-mode bookmark dashboard inspired by LumiList, but simplified to a single page with grouped bookmarks.

## Locked v1 Scope

- Chrome extension using Manifest V3
- New Tab override dashboard
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

---

## Phase 0 - Project Decisions and Technical Setup

### Goal
Lock the MVP decisions and set up the development environment so implementation stays focused.

### Tasks
- confirm final MVP scope
- choose stack:
  - React
  - TypeScript
  - Vite
  - Manifest V3
  - `@crxjs/vite-plugin`
  - `chrome.storage.local`
- create project repo
- create GitHub repo
- set up WSL-based development in VS Code
- create project memory files:
  - `dev-notes/BUILD_CHECKPOINT.md`
  - `dev-notes/MVP_BUILD_PHASES.md`
  - `dev-notes/PRD.md`

### Done When
- repo exists locally and on GitHub
- VS Code is opened in WSL mode
- stack choice is locked
- notes files exist

---

## Phase 1 - Extension Scaffold and New Tab Shell

### Goal
Create a working Chrome extension shell that loads a custom dashboard page.

### Tasks
- scaffold the project with Vite + React + TypeScript
- configure Manifest V3
- add Chrome extension plugin setup
- create extension manifest
- override the New Tab page
- make the extension action open the dashboard page
- create the initial dashboard page
- add a basic dark shell layout
- render placeholder sample groups and bookmarks

### Done When
- opening a new Chrome tab shows the custom dashboard
- clicking the extension action opens the dashboard
- the page builds and loads without errors
- the UI has a basic dark theme shell

---

## Phase 2 - Data Model and Storage Layer

### Goal
Create the persistent local data model for groups, bookmarks, and settings.

### Tasks
- define TypeScript types for:
  - settings
  - groups
  - bookmarks
- create storage wrapper around `chrome.storage.local`
- create bootstrap logic for default data
- ensure default `Ungrouped` group exists
- implement create/read/update/delete helpers for bookmarks
- implement create/read/update/delete helpers for groups
- persist group ordering
- persist bookmark ordering
- persist lock state

### Done When
- data survives browser refresh/reopen
- bookmarks and groups can be loaded from storage
- app starts with default valid data
- storage access is abstracted cleanly

---

## Phase 3 - Core Dashboard UI

### Goal
Render a usable bookmark dashboard with a strong dark visual style.

### Tasks
- create layout structure:
  - main dashboard area
  - sidebar area
- build group card components
- build bookmark row components
- display favicon + single-line title
- truncate long text cleanly
- create dark LumiList-inspired styling:
  - dark background
  - soft borders
  - rounded cards
  - subtle accent glow
  - muted text
- add top controls area for future actions

### Done When
- dashboard visually resembles the target direction
- groups render as distinct cards
- bookmarks render as compact rows
- layout is stable and readable

---

## Phase 4 - Add, Edit, and Delete Flows

### Goal
Make bookmark and group management usable from the UI.

### Tasks
- add "Add Bookmark" action
- add "Add Group" action
- show Edit action when hovering a bookmark
- create compact edit popup anchored near bookmark row
- support editing:
  - group
  - name
  - URL
  - tags
- implement Save and Cancel
- implement bookmark delete with confirmation
- support rename group
- support delete group with safe handling
- decide behavior when deleting a group:
  - move bookmarks to Ungrouped

### Done When
- bookmarks can be created from the dashboard
- bookmarks can be edited quickly
- bookmarks can be deleted safely
- groups can be added, renamed, and deleted

---

## Phase 5 - Import and Export Backup

### Goal
Support reliable manual backup and restore using JSON.

### Tasks
- define backup JSON schema
- implement Export Backup action
- export:
  - settings
  - groups
  - bookmarks
  - ordering metadata
  - version field
- implement Import Backup action
- validate imported JSON schema
- support replace-all import only
- show confirmation before overwrite
- reject invalid/corrupt JSON gracefully

### Done When
- user can export a valid JSON backup file
- user can import a valid backup file
- invalid imports fail safely with clear messaging

---

## Phase 6 - Sidebar Search and Tag Filtering

### Goal
Add filtering without breaking spatial memory.

### Tasks
- create sidebar search input
- implement live case-insensitive filtering by:
  - bookmark name
  - bookmark URL
- create tag list from unique tags across all bookmarks
- allow click-to-filter by tag
- provide clear tag filter reset
- preserve layout slots for hidden bookmarks
- make hidden bookmarks:
  - invisible
  - non-interactive
- keep all group cards visible at all times
- prevent layout collapse/reflow during filtering

### Done When
- typing instantly filters bookmarks in place
- clicking a tag filters bookmarks in place
- bookmark positions do not shift
- group cards never disappear
- hidden bookmarks leave preserved empty space

---

## Phase 7 - Drag-and-Drop and Locking

### Goal
Allow intentional rearrangement of groups and bookmarks while preventing accidental changes.

### Tasks
- add visible lock/unlock control
- default to locked on load
- persist lock state
- disable all drag-and-drop while locked
- enable drag-and-drop while unlocked
- support:
  - group reorder
  - bookmark reorder within group
  - bookmark move across groups
- persist updated order after every move
- add clear unlocked visual state

### Done When
- no accidental reordering happens while locked
- groups can be reordered when unlocked
- bookmarks can be moved within and across groups when unlocked
- new order persists after reload

---

## Phase 8 - Quick Save Shortcut

### Goal
Support fast capture of the current page from anywhere in Chrome.

### Tasks
- add background/service worker command handling
- define keyboard shortcut command in manifest
- use a safe default shortcut only if Chrome allows it
- allow the shortcut to be changed by the user in `chrome://extensions/shortcuts`
- open quick-save popup when command is triggered
- prefill:
  - current page title
  - current page URL
  - default group = Ungrouped
  - empty tags
- allow save/cancel from popup
- save bookmark into storage

### Done When
- shortcut triggers quick-save flow
- current page title and URL are prefilled
- bookmark saves correctly to selected group
- the shortcut can be remapped safely if the default is unavailable or conflicts

---

## Phase 9 - Polish and Hardening

### Goal
Improve quality, feel, and stability so the extension feels finished.

### Tasks
- refine spacing, hover states, and typography
- improve empty states
- improve favicon fallback behavior
- improve popup positioning and keyboard flow
- improve accessibility:
  - focus states
  - labels
  - contrast
- test with larger bookmark counts
- test edge cases:
  - empty groups
  - duplicate URLs
  - invalid URLs
  - broken favicon URLs
  - invalid import files
- clean up code structure and comments
- update README with install/build instructions

### Done When
- extension feels smooth and intentional
- common edge cases are handled
- README is usable
- codebase is ready for long-term iteration

---

## Recommended Build Order

1. Phase 0 - Project Decisions and Technical Setup
2. Phase 1 - Extension Scaffold and New Tab Shell
3. Phase 2 - Data Model and Storage Layer
4. Phase 3 - Core Dashboard UI
5. Phase 4 - Add, Edit, and Delete Flows
6. Phase 5 - Import and Export Backup
7. Phase 6 - Sidebar Search and Tag Filtering
8. Phase 7 - Drag-and-Drop and Locking
9. Phase 8 - Quick Save Shortcut
10. Phase 9 - Polish and Hardening

---

## Implementation Note

Keep the official phase order as-is, but treat **Phase 3 - Core Dashboard UI** and **Phase 4 - Add, Edit, and Delete Flows** as one practical implementation stream during development.

Reasoning:
- once the real storage layer exists, the fastest path is usually to build the real UI and basic CRUD together
- search and tag filtering should still come before drag-and-drop because they are core to the product and lower risk to implement
- quick-save should remain later because it depends on stable storage and editing flows
