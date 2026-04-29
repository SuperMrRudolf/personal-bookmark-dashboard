# Deep Researcher Prompt

I need deep technical research and practical guidance for a drag-and-drop issue in a React bookmark dashboard Chrome extension. Please research dnd-kit documentation, GitHub issues/discussions, Stack Overflow posts, blog posts, examples, and other developers' experiences with similar multi-container sortable layouts. I am especially interested in why bookmark dragging works perfectly in this app, while group dragging across fixed columns does not land where the live drag preview suggests it will land.

## Project Overview

This project is a personal bookmark dashboard Chrome extension. It replaces or enhances a browser dashboard/new-tab style experience with organized bookmark groups.

The app lets the user:

- Create bookmark groups.
- Add bookmarks to groups.
- Edit group names and bookmark details.
- Tag bookmarks.
- Search and filter bookmarks by text and tags.
- Hide filtered-empty groups while search/tag filters are active.
- Lock/unlock editing.
- Drag bookmarks within a group and between groups.
- Drag groups to reorder them.
- Use a normal dashboard view and a grid edit view.

The dashboard data model is simple:

```ts
export type Bookmark = {
  id: string
  name: string
  url: string
  groupId: string
  tags: string[]
  createdAt: string
  updatedAt: string
  order: number
  faviconUrl?: string
}

export type BookmarkGroup = {
  id: string
  name: string
  column: 0 | 1 | 2 | 3
  order: number
  createdAt: string
  updatedAt: string
}
```

Groups have a fixed `column` value from `0` to `3`, and an `order` value within that column. Bookmarks have a `groupId` and an `order` within that group.

## Frameworks And Libraries

The relevant stack is:

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.1.0",
    "@vitejs/plugin-react": "^5.0.4",
    "typescript": "^5.9.3",
    "vite": "^7.1.11"
  }
}
```

The app uses:

- `DndContext` from `@dnd-kit/core`
- `DragOverlay`
- `PointerSensor`
- `useDroppable`
- `SortableContext`, `useSortable`, `arrayMove`, and `verticalListSortingStrategy` from `@dnd-kit/sortable`
- Custom collision detection

## Layout Overview

The normal dashboard view now has four explicit group columns. This replaced an older CSS `column-count` masonry layout, because CSS columns were making sortable group behavior worse.

Current normal view CSS is conceptually:

```css
.group-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

.group-column {
  display: flex;
  flex-direction: column;
  min-height: 120px;
}

.group-column-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
```

Each fixed column renders its own `SortableContext`:

```tsx
<GroupColumnDropZone className="group-column" column={column} key={column}>
  <SortableContext
    items={columnGroups.map((group) => group.id)}
    strategy={verticalListSortingStrategy}
  >
    <div className="group-column-stack">
      {columnGroups.map((group) => (
        <SortableGroupCard key={group.id} group={group} />
      ))}
    </div>
  </SortableContext>
</GroupColumnDropZone>
```

There is also a grid edit mode. It renders collapsible vertical sections:

- Column 1
- Column 2
- Column 3
- Column 4

Each grid edit column section also has its own `SortableContext` with `verticalListSortingStrategy`.

## Bookmark Dragging: This Works Perfectly

Bookmark drag and drop works well. The user can:

- Reorder bookmarks within a group.
- Drag bookmarks from one group to another.
- Release bookmarks where expected.
- See bookmark order persist correctly.

The important structure is that bookmarks are rendered inside a real vertical list within each group:

```tsx
<SortableContext
  items={groupBookmarks.map((bookmark) => bookmark.id)}
  strategy={verticalListSortingStrategy}
>
  {groupBookmarks.map((bookmark) => (
    <SortableBookmarkRow key={bookmark.id} bookmark={bookmark} />
  ))}
</SortableContext>
```

Each bookmark row uses `useSortable`:

```tsx
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: bookmark.id,
  disabled: locked || !visible,
  data: {
    bookmark,
    type: 'bookmark',
  },
})
```

For same-group bookmark reordering, the app waits until `onDragEnd`, then uses `arrayMove` inside the group:

```tsx
const groupBookmarks = currentData.bookmarks
  .filter((bookmark) => bookmark.groupId === activeBookmark.groupId)
  .sort((left, right) => left.order - right.order)

const oldIndex = groupBookmarks.findIndex((bookmark) => bookmark.id === activeBookmarkId)
const newIndex = groupBookmarks.findIndex((bookmark) => bookmark.id === overBookmarkId)

const reorderedBookmarks = arrayMove(groupBookmarks, oldIndex, newIndex).map(
  (bookmark, index) => ({
    ...bookmark,
    order: index,
  }),
)
```

For cross-group bookmark dragging, the app previews the move during drag. It uses pointer geometry to find the group under the pointer:

```tsx
const targetGroupElement = document
  .elementsFromPoint(pointer.x, pointer.y)
  .map((element) =>
    element instanceof HTMLElement
      ? element.closest<HTMLElement>('[data-group-id]')
      : null,
  )
  .find((element): element is HTMLElement => Boolean(element))
```

Then it computes the target bookmark index by comparing pointer Y against visible bookmark row midpoints:

```tsx
const rowElements = Array.from(
  targetGroupElement.querySelectorAll<HTMLElement>(
    '.bookmark-row[data-bookmark-id]:not(.is-hidden), .grid-edit-row[data-bookmark-id]:not(.is-hidden)',
  ),
).filter((rowElement) => rowElement.dataset.bookmarkId !== activeBookmarkId)

return rowElements.findIndex((rowElement) => {
  const rect = rowElement.getBoundingClientRect()
  return pointerY < rect.top + rect.height / 2
})
```

This bookmark behavior feels fluid and correct. It is the reference behavior we want for groups.

## Group Dragging: The Problem

Group dragging does not work correctly, despite the layout now being four explicit columns and each column having its own `SortableContext`.

The desired group behavior:

- Each group belongs to one fixed column.
- Groups stack vertically within that column.
- A group can be reordered within its own column.
- A group can be dragged to another column.
- Empty columns must be valid drop targets.
- On release, the group should land exactly where the live drag movement/slot suggested it would land.
- Group `column` and per-column `order` should persist after reload.

What actually happens:

- While dragging, the visual movement often looks correct.
- The slot appears to open in the correct place.
- But on release, the group jumps to a different position.
- Same-column drags can look like they worked during movement, then snap back to the old position or land in the wrong place.
- Cross-column drags can show the group at the top of the target column while dragging, but on release it lands one position lower or somewhere else.
- The user describes it as "the release function makes it jump."

The core symptom:

> The live drag preview and final persisted placement disagree.

## Current Group Drag Implementation

Groups use `useSortable` like this:

```tsx
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: props.group.id,
  disabled: props.locked,
  data: {
    group: props.group,
    type: 'group',
  },
})
```

The group card applies the sortable transform:

```tsx
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
}
```

The active group card is hidden during dragging:

```css
.group-card.is-dragging {
  opacity: 0;
  box-shadow: none;
}
```

Each column is also a droppable:

```tsx
function GroupColumnDropZone({ children, className, column }) {
  const { setNodeRef } = useDroppable({
    id: getGroupColumnDropId(column),
    data: {
      column,
      type: 'group-column',
    },
  })

  return (
    <section className={className} data-group-column={column} ref={setNodeRef}>
      {children}
    </section>
  )
}
```

The current collision detection for active groups:

- Allows both `group` and `group-column` droppables.
- Excludes the active group's own droppable id.
- Finds the column under the pointer using `pointerWithin`.
- Then uses `closestCenter` among group droppables in that column.
- If no group is found in that column, it returns the column droppable.

Conceptually:

```tsx
if (activeType === 'group') {
  const columnPointerCollisions = pointerWithin(columnContainers)

  if (columnPointerCollisions.length > 0) {
    const overColumn = columnPointerCollisions[0].data.droppableContainer.data.current.column
    const columnGroupContainers = groupContainers.filter(
      (container) => container.data.current.group.column === overColumn,
    )
    const columnGroupCollisions = closestCenter(columnGroupContainers)

    return columnGroupCollisions.length > 0
      ? columnGroupCollisions
      : columnPointerCollisions
  }

  return closestCenter(allGroupAndColumnContainers)
}
```

There is also a ref that remembers the last valid group/column drop target during drag, to avoid relying only on the final `event.over`.

## Things Already Tried

We have tried several approaches, but none fully solved group release placement:

1. CSS multi-column masonry layout
   - Used `column-count: 4`.
   - Problem: dnd-kit sortable does not understand CSS multi-column masonry well.
   - Browser visually flows items top-to-bottom in columns while DOM order stays one flat list.
   - This was abandoned.

2. Row-first CSS Grid masonry attempt
   - Tried measuring card heights and using `grid-row-end: span N`.
   - It looked weird and caused crashes during group dragging.
   - This was undone.

3. Fixed four-column layout
   - Added `column: 0 | 1 | 2 | 3` to groups.
   - Normal view renders four explicit columns.
   - Each column has a separate `SortableContext`.
   - This matches dnd-kit multiple-container patterns more closely.
   - Still, group release placement is wrong.

4. Pointer-geometry projection
   - Tried using pointer coordinates to find target column and target index.
   - Tried projecting temporary dashboard state during drag.
   - The green placeholder sometimes appeared correctly, but release still jumped.

5. Let dnd-kit handle same-column movement
   - Stopped mutating group state during same-column drag.
   - Used `arrayMove` on drag end, similar to bookmarks.
   - Cross-column moves still preview during drag.
   - This made live movement look better but release still does not reliably match.

6. Hide active group during drag
   - Changed `.group-card.is-dragging` to `opacity: 0`.
   - This removed a misleading visible placeholder.
   - It did not solve the release mismatch.

7. Remember last valid group drop target
   - Added a ref storing the last valid `group` or `group-column` target seen during drag.
   - Drop commit uses this target as a fallback instead of final `event.over`.
   - Still not solved.

## Research Questions

Please research and answer:

1. What is the recommended dnd-kit architecture for sorting items across multiple vertical containers when each item has a persisted `containerId`/`column` and `order`?

2. Should each column have its own `SortableContext`, or should all groups be in one parent `SortableContext` with a custom strategy?

3. For multiple containers, should state be updated during `onDragOver`, `onDragMove`, or only `onDragEnd`?

4. Why might the live dnd-kit transform preview look correct while `onDragEnd` commits the wrong order?

5. In dnd-kit, does `event.over` on drag end sometimes differ from the last meaningful over target during drag?

6. Are there known issues with nested sortable contexts in this setup?
   - Groups are sortable.
   - Bookmarks inside groups are also sortable.
   - Both use the same `DndContext`.
   - Active drag type is distinguished by `data.current.type`.

7. Could the group droppable and group-column droppable be competing in a way that causes wrong final placement?

8. Is the custom collision detection approach wrong for multi-container sorting?

9. For cross-column sorting, should we use dnd-kit's official multiple containers example more directly?

10. Should we use `rectSortingStrategy`, `verticalListSortingStrategy`, or a custom strategy for fixed vertical columns?

11. Should the app maintain state as:
    - one flat `groups` array with `column` and `order`, or
    - a derived object like `{ columnId: groupId[] }`, updating this during drag, then converting back to persisted data?

12. Are there recommended examples of dnd-kit multi-container sorting that preserve exact drop location on release?

13. Are there pitfalls around using `DragOverlay` with sortable multi-container lists?

14. Are there pitfalls around hiding the active sortable item with `opacity: 0`?

15. Are there issues caused by CSS gaps, padding, section wrappers, nested divs, or `min-height` droppable columns?

16. Should empty columns be droppable using `useDroppable`, or should they be represented differently?

17. Should group drag and bookmark drag be separated into different `DndContext`s to avoid nested drag systems interfering?

18. Is React 19 relevant to any dnd-kit behavior here?

19. Are there active dnd-kit issues/bugs around React 19, nested SortableContexts, or multiple containers?

20. If dnd-kit is not ideal for this exact UI, what library or pattern would be more reliable?

## Desired Output

Please provide:

1. A diagnosis of the most likely root cause.
2. Links to relevant documentation, examples, GitHub issues, discussions, Stack Overflow answers, or articles.
3. A recommended implementation approach.
4. Pseudocode or concrete React/dnd-kit code for the recommended approach.
5. Specific changes to make to this app.
6. Any warnings about approaches we should avoid.
7. A checklist to verify the fix:
   - Same-column group reorder to top/middle/bottom.
   - Cross-column group reorder to top/middle/bottom.
   - Drag into empty column.
   - Drag while search/tag filter is active.
   - Bookmark drag still works.
   - Grid edit mode still works.

## Important Preference

Please optimize for correctness and simplicity over preserving previous experiments. The bookmark dragging already works perfectly; the group dragging should become similarly predictable. If the current architecture is too tangled, recommend a cleaner architecture even if it requires refactoring the group drag state.
