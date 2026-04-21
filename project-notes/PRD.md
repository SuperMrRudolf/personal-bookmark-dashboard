# Product Requirements Document (PRD)

## Product Name
**Personal Bookmark Dashboard Chrome Extension**

## Version
**v1.0 (Locked Scope)**

## Product Owner
User

## Document Purpose
Define the scope, behavior, UX, data model, and technical requirements for a personal Chrome extension that replaces the New Tab page with a dark-mode bookmark dashboard inspired by LumiList’s visual style, while remaining simpler and single-page in v1.

---

## 1. Product Overview

This product is a **personal Chrome extension** that replaces the default Chrome New Tab page with a **single-page bookmark dashboard**.

The dashboard is designed to feel:
- dark
- modern
- minimal
- compact
- visually inspired by LumiList

Each bookmark appears as a **single-line row** with:
- the site favicon
- the bookmark name

Bookmarks are organized into **groups**, and the user can:
- rearrange groups
- rearrange bookmarks within groups
- move bookmarks between groups
- lock the layout to avoid accidental changes
- quickly save the current page
- edit bookmarks with a tiny popup
- search by text
- filter by tag
- export/import all data for backup

This is a **local-first**, **single-user**, **single-page** product for v1.

---

## 2. Confirmed v1 Scope

The following decisions are **locked for v1**:

- Chrome extension using **Manifest V3**
- **New Tab override**
- **one single dashboard page only**
- **dark LumiList-inspired UI**
- **group cards on a fixed page layout**
- **bookmark rows with favicon + one-line name**
- **add / edit / delete bookmarks**
- **add / rename / delete groups**
- **drag-and-drop for groups and bookmarks**
- **lock / unlock toggle**, locked by default
- **text search by name + URL**
- **tag click filter**
- **filters hide items in place without collapsing layout**
- **quick-save popup via keyboard command**
- **export / import JSON backup**
- **local storage only**
- **default group = Ungrouped**
- **import mode = replace all only**

---

## 3. Goals

### Primary Goals
1. Replace the default Chrome New Tab page with a personal bookmark dashboard.
2. Let the user organize bookmarks into named groups.
3. Preserve spatial memory by keeping group positions stable during filtering.
4. Make bookmark capture and editing fast and low-friction.
5. Make backup and restore simple using JSON.
6. Deliver a polished dark UI inspired by LumiList.

### Secondary Goals
1. Allow the dashboard to also be opened manually from an extension action or bookmark-bar shortcut.
2. Support lightweight tag-based organization across groups.
3. Keep the system local-first and easy to understand.

---

## 4. Non-Goals for v1

The following are **out of scope** for v1:

- multiple top-level category tabs/pages
- cloud sync as a core feature
- collaborative/team use
- non-Chrome browser support as a priority
- AI categorization or auto-tagging
- backend or user account system
- automatic cloud backup integration
- merge-mode import

---

## 5. Target User

### Primary User
A personal power user who wants:
- a cleaner alternative to the bookmark bar
- a visually organized home for frequently used links
- stable bookmark placement for muscle memory
- quick saving and editing
- reliable manual backup

### User Needs
- “I want all my bookmarks visible on one page in groups.”
- “I want it to look dark, clean, and premium.”
- “I want to rearrange things only when I intentionally unlock it.”
- “I want search that does not mess up where things live.”
- “I want to save pages quickly.”
- “I want a simple backup file I can store in OneDrive.”

---

## 6. Core User Stories

### Dashboard and Layout
- As a user, I want my dashboard to open every time I create a new Chrome tab.
- As a user, I want to open the dashboard manually from the extension button.
- As a user, I want to be able to save the dashboard URL and open it from the bookmark bar.
- As a user, I want bookmarks grouped into labeled group cards.
- As a user, I want each bookmark shown as a single-line row with favicon and name.
- As a user, I want the interface to feel visually close to LumiList.

### Rearranging and Locking
- As a user, I want to drag groups to reorder them.
- As a user, I want to drag bookmarks within a group.
- As a user, I want to drag bookmarks between groups.
- As a user, I want drag behavior disabled when the page is locked.
- As a user, I want a clear lock/unlock control so accidental changes do not happen.

### Editing and Saving
- As a user, I want an Edit action to appear when hovering a bookmark.
- As a user, I want Edit to open a small popup near the bookmark.
- As a user, I want to change the group, name, URL, and tags.
- As a user, I want Save and Cancel buttons that close the popup.
- As a user, I want to delete bookmarks.
- As a user, I want a keyboard shortcut to save the current page quickly.
- As a user, I want the quick-save popup to prefill the current page title and URL.
- As a user, I want the quick-save popup to default to the Ungrouped group.

### Search and Filtering
- As a user, I want a text search box that filters instantly by bookmark name and URL.
- As a user, I want matching bookmarks to stay in their normal positions.
- As a user, I want non-matching bookmarks to become invisible and unclickable.
- As a user, I want group cards to remain visible at all times.
- As a user, I want a list of all unique tags.
- As a user, I want clicking a tag to filter bookmarks the same way as text search.

### Backup and Restore
- As a user, I want to export all bookmarks, groups, and order into a JSON file.
- As a user, I want to import that JSON file later to restore everything.
- As a user, I want this backup file to be easy to store in OneDrive.

---

## 7. Functional Requirements

### 7.1 Entry Points

The extension must support these access paths:

1. **New Tab Override**
   - Opening a new Chrome tab loads the dashboard.

2. **Extension Action**
   - Clicking the extension toolbar icon opens the dashboard.

3. **Bookmark-Bar Shortcut**
   - The user can save/bookmark the dashboard page URL and launch it from the bookmark bar.

---

### 7.2 Dashboard Structure

The dashboard is a **single page** containing:
- group cards
- bookmark rows inside group cards
- a lock/unlock control
- a sidebar area
- a text search area
- a tag list
- controls for import/export
- controls for adding groups/bookmarks

No multi-tab category system exists in v1.

---

### 7.3 Group Requirements

Each group must have:
- unique ID
- group name
- order index

Default rules:
- the system starts with an **Ungrouped** group
- the user can add new groups
- the user can rename groups
- the user can delete groups
- group order is persistent
- group cards are always visible, even during filtering

Delete behavior:
- deleting a group must be confirmed
- bookmarks from a deleted group must be handled safely
- recommended v1 behavior: move those bookmarks to **Ungrouped** before removing the group

---

### 7.4 Bookmark Requirements

Each bookmark must have:
- unique ID
- name/title
- URL
- group ID
- tags array
- favicon reference
- created timestamp
- updated timestamp
- order within its group

Rules:
- bookmarks can be added manually
- bookmarks can be edited
- bookmarks can be deleted
- bookmarks can move between groups
- bookmarks can be reordered
- duplicate URLs are allowed in v1

---

### 7.5 Bookmark Display

Each bookmark row must:
- show favicon/icon on the left
- show the bookmark name on one line
- truncate long names cleanly with ellipsis if needed
- open the target URL when clicked

Hover behavior:
- when hovering a bookmark, an **Edit** link appears
- the Edit link should appear left-aligned against the inside edge of the group box, as requested
- the hover affordance must not cause layout shift

---

### 7.6 Bookmark Edit Popup

Clicking **Edit** opens a small popup near that bookmark.

The popup must contain:
- group selector
- name input
- URL input
- tags input
- Save button
- Cancel button
- Delete button

Behavior:
- Save persists changes and closes the popup
- Cancel discards changes and closes the popup
- Delete asks for confirmation, then deletes the bookmark
- Escape key should close the popup when safe

### Tags Input
For v1, tags are entered as:
- **comma-separated free text**

Examples:
- `tools, docs, design`
- stored internally as an array after trimming and normalization

---

### 7.7 Add Bookmark Flow

The dashboard must support adding bookmarks directly from the UI.

Minimum v1 behavior:
- an **Add Bookmark** button exists on the dashboard
- opening it shows a compact form/popup
- fields:
  - group
  - name
  - URL
  - tags
- default group = **Ungrouped**
- save persists the new bookmark
- cancel closes without saving

---

### 7.8 Quick Save Shortcut

The extension must support a keyboard command for quick-save.

Desired shortcut:
- **Ctrl+B**

Important constraint:
- Chrome or the OS may block or override this shortcut
- therefore v1 must treat **Ctrl+B as preferred, but not guaranteed**
- the implementation should allow an alternative command if needed

Quick-save behavior:
1. User triggers the command while viewing any page.
2. A save popup appears.
3. Popup is prefilled with:
   - current page title
   - current page URL
   - group = Ungrouped
   - empty tags
4. User can change:
   - group
   - name
   - URL
   - tags
5. User clicks Save or Cancel.
6. Save creates the bookmark.

---

### 7.9 Drag-and-Drop

Supported drag-and-drop behaviors:
- reorder groups
- reorder bookmarks within a group
- move bookmarks between groups

Behavior:
- when **locked**, drag-and-drop is disabled
- when **unlocked**, drag-and-drop is enabled
- order changes persist immediately after drop

---

### 7.10 Lock / Unlock

The dashboard must include a visible control for:
- **Locked**
- **Unlocked**

Rules:
- default state on load = **Locked**
- state persists across sessions
- the current state must be visually obvious
- unlocking should feel intentional

Purpose:
- prevent accidental layout changes

---

### 7.11 Text Search

The sidebar must include a general text search field.

Search must:
- update instantly while typing
- match against bookmark **name**
- match against bookmark **URL**
- be case-insensitive

Display behavior during search:
- matching bookmarks remain in their usual visual location
- non-matching bookmarks become invisible
- non-matching bookmarks become unclickable
- hidden items must keep their layout slot reserved
- group cards always remain visible
- other items must not collapse upward to fill space

This is a **core product requirement**.

---

### 7.12 Tag Filter

The sidebar must show a unique list of all tags currently used.

Behavior:
- clicking a tag applies a filter
- only bookmarks with that tag remain visible/clickable
- non-matching bookmarks become invisible and unclickable
- group cards remain visible
- bookmark positions remain fixed
- the user can clear the active tag filter easily

Tag filtering must behave the same way as text search in terms of layout stability.

---

### 7.13 Backup and Restore

The extension must support manual backup and restore.

#### Export
The user can export all data to a JSON file.

The export must include:
- version metadata
- groups
- bookmarks
- ordering information
- settings needed to restore layout behavior

#### Import
The user can import a JSON backup file.

v1 rules:
- validate schema before import
- **replace-all only**
- ask for confirmation before destructive import
- reject invalid/corrupted files gracefully

Recommended user workflow:
- export JSON manually
- save the file in OneDrive

---

## 8. UX Requirements

### 8.1 Visual Style

The UI must be strongly inspired by the provided LumiList screenshot:

- dark overall theme
- subtle glow/gradient accents
- rounded group containers
- soft borders
- muted body text
- brighter headings
- compact bookmark rows
- premium minimalist feel

v1 is **dark mode only**.

---

### 8.2 Layout Style

The dashboard should use:
- a **fixed page layout** of group cards
- stable placement designed for spatial memory

For v1:
- group cards should feel fixed and predictable
- filtering must not cause the user’s mental map to shift

---

### 8.3 Information Density

The dashboard should prioritize scanability:
- one-line bookmarks
- no oversized bookmark cards
- icon + text presentation
- low clutter
- compact spacing

---

### 8.4 Spatial Stability

This is one of the most important UX requirements.

During filtering:
- bookmarks must not jump to new positions
- group cards must not disappear
- hidden bookmarks must leave blank reserved space
- the page should preserve the user’s learned map of where links live

---

### 8.5 Hover and Popup Behavior

Hover:
- show Edit clearly but subtly
- avoid layout shift

Popup:
- compact
- close to the target bookmark
- keyboard friendly
- Save / Cancel close it quickly

---

## 9. Data Model

### 9.1 Storage Strategy

v1 is **local-only**.

Recommended storage:
- `chrome.storage.local`

No cloud sync in v1.

---

### 9.2 Data Shape (Draft)

```json
{
  "version": 1,
  "settings": {
    "isLocked": true,
    "theme": "dark"
  },
  "groups": [
    {
      "id": "group_ungrouped",
      "name": "Ungrouped",
      "order": 0
    }
  ],
  "bookmarks": [
    {
      "id": "bm_123",
      "name": "Example",
      "url": "https://example.com",
      "groupId": "group_ungrouped",
      "tags": ["tools", "docs"],
      "favicon": "https://example.com/favicon.ico",
      "order": 0,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}

---

### 9.3 Favicon Strategy

Preferred favicon strategy:
1. browser-provided favicon resolution if available  
2. direct site favicon path  
3. fallback generic icon  

---

### 9.4 Data Integrity Requirements

The system must:
- persist ordering after edits and drag/drop  
- avoid duplicate IDs  
- validate URLs before save  
- handle invalid import files safely  
- preserve locked/unlocked setting  
- preserve group order and bookmark order  

---

## 10. Technical Requirements

### 10.1 Platform
- Chrome Extension  
- **Manifest V3**

### 10.2 Suggested Stack
- React  
- TypeScript  
- Vite  
- `@crxjs/vite-plugin`  
- `chrome.storage.local`  

### 10.3 Core Chrome Capabilities
- New Tab override  
- extension action  
- keyboard commands  
- local storage  
- tab metadata access for quick-save  

### 10.4 Suggested Architecture
- dashboard page (main UI)  
- background/service worker  
- storage wrapper around `chrome.storage.local`  
- import/export utility  
- drag-and-drop module  

### 10.5 Performance Targets
- responsive for normal personal usage  
- target support for roughly **500–2000 bookmarks**  
- instant-feeling filter updates while typing  

### 10.6 Accessibility Requirements
- keyboard-accessible controls  
- visible focus states  
- semantic labels  
- sufficient contrast in dark mode  

---

## 11. Edge Cases and Constraints

### 11.1 Shortcut Limitations
`Ctrl+B` may conflict with browser or OS bindings.

Requirement:
- try to support it  
- do not assume it is guaranteed  
- allow alternate mapping if needed  

### 11.2 Hidden-But-Stable Filtering
Filtered bookmarks must become invisible and non-interactive **without collapsing layout**.

Requirement:
- their slot must remain reserved  

### 11.3 Empty Groups
If a group has:
- zero bookmarks  
- or zero visible bookmarks under a filter  

Then:
- the group card still remains visible  

### 11.4 Duplicate URLs
Allowed in v1.

Optional future improvement:
- warn the user if the same URL already exists  

### 11.5 Group Deletion
Deleting a group should not destroy bookmarks silently.

Recommended v1 behavior:
- confirm deletion  
- move contained bookmarks to Ungrouped  
- then remove the group  

---

## 12. Success Criteria

### Launch Success Criteria
1. Opening a new Chrome tab shows the dashboard.  
2. The dashboard can also be opened manually.  
3. The user can add, edit, move, and delete bookmarks.  
4. The user can add, rename, and delete groups.  
5. Groups and bookmarks can be reordered only when unlocked.  
6. Search and tag filtering preserve layout positions.  
7. Export/import backup works without data loss.  
8. The UI matches the intended dark compact style.  

### Usability Targets
1. Save current page in under 5 seconds.  
2. Edit an existing bookmark in under 5 seconds.  
3. Search results appear instantly.  
4. No accidental reorder while locked.  

---

## 13. MVP Build Phases

### Phase 1 — Scaffold and Extension Shell
- repo setup  
- Vite + React + TypeScript  
- Manifest V3 wiring  
- New Tab override  
- extension action opening dashboard  
- base dark shell  
- sample data rendering  

### Phase 2 — Real Data and Storage
- data models  
- storage wrapper  
- default bootstrap data  
- persistence  
- import/export JSON  

### Phase 3 — Dashboard UI
- group cards  
- bookmark rows  
- sidebar shell  
- add group/add bookmark controls  
- LumiList-inspired styling  

### Phase 4 — Edit/Add Flows
- hover Edit action  
- compact edit popup  
- add bookmark UI  
- rename/delete group flow  

### Phase 5 — Stable Search and Tag Filtering
- live text search  
- tag list filter  
- invisible/non-interactive hidden bookmarks  
- no collapsing layout  

### Phase 6 — Drag-and-Drop and Lock Mode
- reorder groups  
- reorder bookmarks  
- move bookmarks between groups  
- persistent locked/unlocked state  

### Phase 7 — Quick Save Command
- keyboard command  
- current tab metadata  
- quick-save popup  
- save flow  

### Phase 8 — Polish
- visual refinement  
- empty states  
- fallback favicon behavior  
- accessibility polish  
- bug fixes  

---

## 14. Backup Recommendation

### Recommended v1 Backup Method
Use **JSON export/import**.

Recommended user workflow:
1. export backup JSON from the extension  
2. save the file manually in OneDrive  
3. keep dated backup files  

Example filename:
- `bookmark-dashboard-backup-2026-04-21.json`  

Why this is the right v1 choice:
- simple  
- portable  
- easy to inspect  
- easy to restore  
- no backend required  

---

## 15. Final Product Statement

Build a **Chrome New Tab extension** that acts as a **personal dark-mode bookmark dashboard** with:

- grouped bookmark cards  
- compact favicon-first bookmark rows  
- stable in-place filtering  
- intentional drag-and-drop organization  
- lock/unlock layout control  
- quick-save capture  
- tiny low-friction editing popups  
- JSON backup/restore  

The experience should feel visually inspired by **LumiList**, but simplified into a **single fast page** optimized for personal use and spatial memory.