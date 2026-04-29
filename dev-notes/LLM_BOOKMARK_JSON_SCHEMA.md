# LLM Bookmark JSON Schema

This file describes the JSON format that the Personal Bookmark Dashboard exports and can import again after editing.

Use it when you want an LLM to clean, rename, regroup, retag, or deduplicate bookmarks and then return valid JSON.

## Required top-level shape

```json
{
  "backupVersion": 1,
  "exportedAt": "2026-04-28T12:34:56.000Z",
  "app": "personal-bookmark-dashboard",
  "dashboard": {
    "schemaVersion": 1,
    "settings": {
      "locked": true
    },
    "groups": [],
    "bookmarks": []
  }
}
```

## Top-level rules

- `backupVersion` must be `1`
- `app` must be `"personal-bookmark-dashboard"`
- `dashboard.schemaVersion` must be `1`
- `dashboard.settings.locked` should be a boolean
- `groups` must be an array
- `bookmarks` must be an array

## Group object shape

Each item in `dashboard.groups` should look like this:

```json
{
  "id": "group-123",
  "name": "Research",
  "column": 0,
  "order": 0,
  "createdAt": "2026-04-28T12:34:56.000Z",
  "updatedAt": "2026-04-28T12:34:56.000Z"
}
```

### Group rules

- `id`: string
- `name`: string
- `column`: optional number, `0`, `1`, `2`, or `3`; defaults to `0`
- `order`: number
- `createdAt`: ISO timestamp string
- `updatedAt`: ISO timestamp string

## Bookmark object shape

Each item in `dashboard.bookmarks` should look like this:

```json
{
  "id": "bookmark-123",
  "name": "Example",
  "url": "https://example.com",
  "groupId": "group-123",
  "groupName": "Research",
  "tags": ["docs", "tools"],
  "order": 0,
  "createdAt": "2026-04-28T12:34:56.000Z",
  "updatedAt": "2026-04-28T12:34:56.000Z"
}
```

### Bookmark rules

- `id`: string
- `name`: string
- `url`: string
- `groupId`: string
- `groupName`: string recommended
- `tags`: array of strings recommended
- `order`: number
- `createdAt`: ISO timestamp string
- `updatedAt`: ISO timestamp string
- `faviconUrl`: optional string

## Import behavior the LLM should respect

- Keep `groupId` and `groupName` aligned whenever possible.
- Every bookmark should point to a real group.
- If a bookmark moves to another group, update both `groupId` and `groupName`.
- Keep `order` values sequential inside groups for bookmarks: `0, 1, 2, ...`
- Keep `order` values sequential inside each group column: `0, 1, 2, ...`
- Use group `column` values `0` through `3`; these represent dashboard columns 1 through 4.
- Tags should be plain strings, not objects.
- Tags should be trimmed and deduplicated.
- Prefer tag arrays, not comma-separated tag strings, in the final JSON.
- Keep timestamps as strings. If not intentionally editing them, preserve them.
- Preserve IDs unless there is a specific reason to replace them.

## Safe editing guidance for an LLM

- You may rename groups.
- You may rename bookmarks.
- You may update bookmark URLs.
- You may add, remove, or normalize tags.
- You may move bookmarks between existing groups.
- You may create new groups if needed, but every new group must have a unique `id`, a `name`, a `column`, and an `order`.
- You may reorder groups and bookmarks, but keep `order` consistent with the final arrangement.

## Output requirements

- Return valid JSON only.
- Do not wrap the JSON in markdown code fences unless explicitly requested.
- Do not add commentary outside the JSON.
- Do not remove required top-level fields.
- Do not change `backupVersion`, `app`, or `dashboard.schemaVersion`.

## Minimal valid example

```json
{
  "backupVersion": 1,
  "exportedAt": "2026-04-28T12:34:56.000Z",
  "app": "personal-bookmark-dashboard",
  "dashboard": {
    "schemaVersion": 1,
    "settings": {
      "locked": true
    },
    "groups": [
      {
        "id": "group-research",
        "name": "Research",
        "column": 0,
        "order": 0,
        "createdAt": "2026-04-28T12:34:56.000Z",
        "updatedAt": "2026-04-28T12:34:56.000Z"
      }
    ],
    "bookmarks": [
      {
        "id": "bookmark-example",
        "name": "Example",
        "url": "https://example.com",
        "groupId": "group-research",
        "groupName": "Research",
        "tags": ["docs", "tools"],
        "order": 0,
        "createdAt": "2026-04-28T12:34:56.000Z",
        "updatedAt": "2026-04-28T12:34:56.000Z"
      }
    ]
  }
}
```
