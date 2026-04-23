import {
  closestCenter,
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  clearQuickSaveDraft,
  createBookmark,
  createGroup,
  deleteBookmark,
  deleteGroup,
  exportDashboardBackup,
  loadDashboardData,
  loadQuickSaveDraft,
  moveBookmark,
  parseDashboardBackup,
  reorderBookmarks,
  reorderGroups,
  saveDashboardData,
  updateBookmark,
  updateGroup,
} from '../lib/storage'
import type { Bookmark, BookmarkGroup, DashboardData } from '../lib/types'

function matchesBookmark(query: string, selectedTag: string | null, bookmark: Bookmark) {
  const normalizedQuery = query.trim().toLowerCase()
  const queryMatch =
    normalizedQuery.length === 0 ||
    bookmark.name.toLowerCase().includes(normalizedQuery) ||
    bookmark.url.toLowerCase().includes(normalizedQuery)
  const tagMatch = !selectedTag || bookmark.tags.includes(selectedTag)

  return queryMatch && tagMatch
}

function getDisplayHostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function getSafeBookmarkUrl(url: string) {
  try {
    return new URL(url).href
  } catch {
    return null
  }
}

function parseTagInput(value: string) {
  return Array.from(new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean)))
}

function formatTags(tags: string[]) {
  return tags.join(', ')
}

function hasQuickSaveIntent() {
  return new URLSearchParams(window.location.search).get('intent') === 'quick-save'
}

const dashboardCollisionDetection: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type

  if (activeType !== 'group' && activeType !== 'bookmark') {
    return closestCenter(args)
  }

  const droppableContainers = args.droppableContainers.filter((container) => {
    const containerType = container.data.current?.type

    if (activeType === 'bookmark') {
      return containerType === 'bookmark' || containerType === 'group'
    }

    return containerType === activeType
  })
  const filteredArgs = {
    ...args,
    droppableContainers,
  }

  if (activeType === 'group') {
    const pointerCollisions = pointerWithin(filteredArgs)

    return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(filteredArgs)
  }

  const pointerCollisions = pointerWithin(filteredArgs)
  const bookmarkCollisions = pointerCollisions.filter(
    (collision) => collision.data?.droppableContainer.data.current?.type === 'bookmark',
  )
  const groupCollisions = pointerCollisions.filter(
    (collision) => collision.data?.droppableContainer.data.current?.type === 'group',
  )

  if (bookmarkCollisions.length > 0) {
    return bookmarkCollisions
  }

  if (groupCollisions.length > 0) {
    return groupCollisions
  }

  return closestCenter({
    ...args,
    droppableContainers: droppableContainers.filter(
      (container) => container.data.current?.type === 'bookmark',
    ),
  })
}

type GroupCardContentProps = {
  group: BookmarkGroup
  groupBookmarks: Bookmark[]
  locked: boolean
  bookmarkSortingDisabled: boolean
  search: string
  selectedTag: string | null
  onAddBookmark: (groupName: string) => void
  onEditGroup: (group: BookmarkGroup) => void
  onEditBookmark: (bookmark: Bookmark) => void
  onOpenGroupBookmarks: (bookmarks: Bookmark[]) => void
}

function GroupCardContent({
  group,
  groupBookmarks,
  locked,
  bookmarkSortingDisabled,
  search,
  selectedTag,
  onAddBookmark,
  onEditGroup,
  onEditBookmark,
  onOpenGroupBookmarks,
}: GroupCardContentProps) {
  return (
    <>
      <div className="group-header">
        <div>
          <p className="group-label">Group</p>
          <div className="group-title">
            <h2>{group.name}</h2>
            {groupBookmarks.length > 0 ? (
              <button
                className="open-all-button"
                type="button"
                onClick={() => onOpenGroupBookmarks(groupBookmarks)}
              >
                Open all
              </button>
            ) : null}
          </div>
        </div>
        <div className="group-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => onAddBookmark(group.name)}
          >
            Add bookmark
          </button>
          <button className="ghost-button" type="button" onClick={() => onEditGroup(group)}>
            Edit group
          </button>
        </div>
      </div>

      <SortableContext
        items={groupBookmarks.map((bookmark) => bookmark.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="bookmark-list">
          {groupBookmarks.map((bookmark) => (
            <SortableBookmarkRow
              bookmark={bookmark}
              key={bookmark.id}
              locked={locked || bookmarkSortingDisabled}
              onEditBookmark={onEditBookmark}
              search={search}
              selectedTag={selectedTag}
            />
          ))}

          {groupBookmarks.length === 0 ? (
            <p className="group-empty">No bookmarks yet. This group is ready for Phase 4 CRUD.</p>
          ) : null}
        </div>
      </SortableContext>
    </>
  )
}

type SortableGroupCardProps = GroupCardContentProps & {
  locked: boolean
  groupSortingDisabled: boolean
}

function SortableGroupCard(props: SortableGroupCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.group.id,
    disabled: props.locked,
    data: {
      group: props.group,
      type: 'group',
    },
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <section
      className={`group-card ${props.locked || props.groupSortingDisabled ? '' : 'is-sortable'} ${isDragging ? 'is-dragging' : ''}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <GroupCardContent {...props} />
    </section>
  )
}

type SortableBookmarkRowProps = {
  bookmark: Bookmark
  locked: boolean
  search: string
  selectedTag: string | null
  onEditBookmark: (bookmark: Bookmark) => void
}

function BookmarkRow({
  bookmark,
  visible,
  onEditBookmark,
}: {
  bookmark: Bookmark
  visible: boolean
  onEditBookmark: (bookmark: Bookmark) => void
}) {
  const hostname = getDisplayHostname(bookmark.url)

  return (
    <>
      <a
        className="bookmark-link"
        href={bookmark.url}
        tabIndex={visible ? 0 : -1}
        target="_blank"
        rel="noreferrer"
      >
        <img
          className="bookmark-favicon"
          alt=""
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
        />

        <div className="bookmark-copy">
          <span className="bookmark-name">{bookmark.name}</span>
          <span className="bookmark-url">{hostname}</span>
        </div>
      </a>

      <button
        className="bookmark-edit"
        type="button"
        tabIndex={visible ? 0 : -1}
        onClick={() => onEditBookmark(bookmark)}
      >
        Edit
      </button>
    </>
  )
}

function SortableBookmarkRow({
  bookmark,
  locked,
  search,
  selectedTag,
  onEditBookmark,
}: SortableBookmarkRowProps) {
  const visible = matchesBookmark(search, selectedTag, bookmark)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id,
    disabled: locked || !visible,
    data: {
      bookmark,
      type: 'bookmark',
    },
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      className={`bookmark-row ${visible ? '' : 'is-hidden'} ${locked || !visible ? '' : 'is-sortable'} ${isDragging ? 'is-dragging' : ''}`}
      key={bookmark.id}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <BookmarkRow bookmark={bookmark} visible={visible} onEditBookmark={onEditBookmark} />
    </div>
  )
}

export function App() {
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [isBookmarkFormOpen, setIsBookmarkFormOpen] = useState(false)
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [bookmarkGroupName, setBookmarkGroupName] = useState('')
  const [bookmarkName, setBookmarkName] = useState('')
  const [bookmarkUrl, setBookmarkUrl] = useState('')
  const [bookmarkTags, setBookmarkTags] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isQuickSaveIntent, setIsQuickSaveIntent] = useState(hasQuickSaveIntent)
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
  const [draggingBookmarkId, setDraggingBookmarkId] = useState<string | null>(null)
  const dragStartDataRef = useRef<DashboardData | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  useEffect(() => {
    async function hydrateDashboardData() {
      const data = await loadDashboardData()
      setDashboardData(data)
    }

    void hydrateDashboardData()
  }, [])

  useEffect(() => {
    if (!dashboardData || !isQuickSaveIntent) {
      return
    }

    async function openQuickSaveDraft() {
      const draft = await loadQuickSaveDraft()

      if (!draft) {
        setStatusMessage('Quick save could not prefill the current page.')
        clearQuickSaveIntentState()
        return
      }

      setIsBookmarkFormOpen(true)
      setEditingBookmarkId(null)
      setEditingGroupId(null)
      setIsAddingGroup(false)
      setBookmarkGroupName('')
      setBookmarkName(draft.name)
      setBookmarkUrl(draft.url)
      setBookmarkTags('')
      setFormError(null)
    }

    void openQuickSaveDraft()
  }, [dashboardData, isQuickSaveIntent])

  async function toggleLocked() {
    if (!dashboardData) {
      return
    }

    const nextData = {
      ...dashboardData,
      settings: {
        ...dashboardData.settings,
        locked: !dashboardData.settings.locked,
      },
    }

    setDashboardData(nextData)
    await saveDashboardData(nextData)
  }

  function clearQuickSaveIntentState() {
    if (!isQuickSaveIntent) {
      return
    }

    void clearQuickSaveDraft()
    setIsQuickSaveIntent(false)

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete('intent')
    window.history.replaceState({}, '', nextUrl)
  }

  function buildBackupFilename() {
    const timestamp = new Date().toISOString().slice(0, 10)

    return `personal-bookmark-dashboard-backup-${timestamp}.json`
  }

  async function handleExportBackup() {
    try {
      const backup = await exportDashboardBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = objectUrl
      link.download = buildBackupFilename()
      link.click()
      URL.revokeObjectURL(objectUrl)
      setStatusMessage('Backup exported.')
    } catch {
      setStatusMessage('Backup export failed.')
    }
  }

  function openImportPicker() {
    importInputRef.current?.click()
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const parsed = JSON.parse(await file.text())
      const importedData = parseDashboardBackup(parsed)
      const confirmed = window.confirm(
        'Importing a backup will replace your current dashboard, including groups, bookmarks, order, and settings. Continue?',
      )

      if (!confirmed) {
        return
      }

      await saveDashboardData(importedData)
      setDashboardData(importedData)
      closeForms()
      setSearch('')
      setSelectedTag(null)
      setStatusMessage('Backup imported and replaced current data.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.'

      setStatusMessage(message)
    }
  }

  function closeForms() {
    clearQuickSaveIntentState()
    setIsAddingGroup(false)
    setEditingGroupId(null)
    setIsBookmarkFormOpen(false)
    setEditingBookmarkId(null)
    setGroupName('')
    setBookmarkGroupName('')
    setBookmarkName('')
    setBookmarkUrl('')
    setBookmarkTags('')
    setFormError(null)
  }

  function openAddBookmark(initialGroupName = '') {
    setIsBookmarkFormOpen(true)
    setEditingBookmarkId(null)
    setEditingGroupId(null)
    setIsAddingGroup(false)
    setBookmarkGroupName(initialGroupName)
    setBookmarkName('')
    setBookmarkUrl('')
    setBookmarkTags('')
    setFormError(null)
  }

  function openEditBookmark(bookmark: Bookmark) {
    const bookmarkGroup = dashboardData?.groups.find((group) => group.id === bookmark.groupId)

    setEditingBookmarkId(bookmark.id)
    setIsBookmarkFormOpen(true)
    setEditingGroupId(null)
    setIsAddingGroup(false)
    setBookmarkGroupName(bookmarkGroup?.name ?? '')
    setBookmarkName(bookmark.name)
    setBookmarkUrl(bookmark.url)
    setBookmarkTags(bookmark.tags.join(', '))
    setFormError(null)
  }

  function openEditGroup(group: BookmarkGroup) {
    setEditingGroupId(group.id)
    setIsAddingGroup(false)
    setIsBookmarkFormOpen(false)
    setEditingBookmarkId(null)
    setGroupName(group.name)
    setBookmarkName('')
    setBookmarkUrl('')
    setBookmarkTags('')
    setFormError(null)
  }

  function toggleBookmarkTag(tag: string) {
    const currentTags = parseTagInput(bookmarkTags)
    const hasTag = currentTags.includes(tag)
    const nextTags = hasTag
      ? currentTags.filter((currentTag) => currentTag !== tag)
      : [...currentTags, tag]

    setBookmarkTags(formatTags(nextTags))
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!groupName.trim()) {
      setFormError('Group name is required.')
      return
    }

    const nextData = editingGroupId
      ? await updateGroup(editingGroupId, { name: groupName })
      : await createGroup({ name: groupName })
    setDashboardData(nextData)
    closeForms()
  }

  async function handleDeleteGroup() {
    if (!editingGroupId) {
      return
    }

    const confirmed = window.confirm(
      'Delete this group and all bookmarks inside it? This cannot be undone. Move any bookmarks you want to keep to another group before deleting.',
    )

    if (!confirmed) {
      return
    }

    const nextData = await deleteGroup(editingGroupId)
    setDashboardData(nextData)
    closeForms()
  }

  async function handleCreateBookmark(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!bookmarkGroupName.trim()) {
      setFormError('Group is required. Type an existing group name or a new one.')
      return
    }

    if (!bookmarkUrl.trim()) {
      setFormError('Bookmark URL is required.')
      return
    }

    const nextData = editingBookmarkId
      ? await updateBookmark(editingBookmarkId, {
          name: bookmarkName,
          url: bookmarkUrl,
          groupName: bookmarkGroupName,
          tags: bookmarkTags.split(','),
        })
      : await createBookmark({
          name: bookmarkName,
          url: bookmarkUrl,
          groupName: bookmarkGroupName,
          tags: bookmarkTags.split(','),
        })

    setDashboardData(nextData)
    clearQuickSaveIntentState()
    closeForms()
  }

  async function handleDeleteBookmark() {
    if (!editingBookmarkId) {
      return
    }

    const confirmed = window.confirm('Delete this bookmark? This cannot be undone.')

    if (!confirmed) {
      return
    }

    const nextData = await deleteBookmark(editingBookmarkId)
    setDashboardData(nextData)
    closeForms()
  }

  function openGroupBookmarks(groupBookmarks: Bookmark[]) {
    groupBookmarks.forEach((bookmark) => {
      const url = getSafeBookmarkUrl(bookmark.url)

      if (!url) {
        return
      }

      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        void chrome.tabs.create({ url })
        return
      }

      window.open(url, '_blank', 'noopener,noreferrer')
    })
  }

  function handleGroupDragStart(event: DragStartEvent) {
    const dragType = event.active.data.current?.type

    dragStartDataRef.current = dashboardData

    if (dragType === 'group') {
      setDraggingGroupId(String(event.active.id))
      return
    }

    if (dragType === 'bookmark') {
      setDraggingBookmarkId(String(event.active.id))
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const dragType = event.active.data.current?.type

    if (dragType === 'group') {
      previewGroupReorder(event)
      return
    }

    if (dragType === 'bookmark') {
      previewBookmarkReorder(event)
    }
  }

  function getOverGroupId(event: DragOverEvent | DragEndEvent) {
    const overType = event.over?.data.current?.type

    if (overType === 'group') {
      return String(event.over?.id)
    }

    if (overType === 'bookmark') {
      return (event.over?.data.current?.bookmark as Bookmark | undefined)?.groupId ?? null
    }

    return null
  }

  function previewGroupReorder(event: DragOverEvent) {
    const activeGroupId = String(event.active.id)
    const overGroupId = getOverGroupId(event)

    if (!overGroupId || activeGroupId === overGroupId) {
      return
    }

    setDashboardData((current) => {
      if (!current) {
        return current
      }

      const oldIndex = current.groups.findIndex((group) => group.id === activeGroupId)
      const newIndex = current.groups.findIndex((group) => group.id === overGroupId)

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return current
      }

      return {
        ...current,
        groups: arrayMove(current.groups, oldIndex, newIndex).map((group, index) => ({
          ...group,
          order: index,
        })),
      }
    })
  }

  function previewBookmarkReorder(event: DragOverEvent) {
    const activeBookmarkId = String(event.active.id)
    const overType = event.over?.data.current?.type

    if (overType !== 'bookmark' && overType !== 'group') {
      return
    }

    setDashboardData((current) => {
      if (!current) {
        return current
      }

      const activeBookmark = current.bookmarks.find((bookmark) => bookmark.id === activeBookmarkId)

      if (!activeBookmark) {
        return current
      }

      if (overType === 'bookmark') {
        const overBookmarkId = String(event.over?.id)
        const overBookmark = current.bookmarks.find((bookmark) => bookmark.id === overBookmarkId)

        if (!overBookmark) {
          return current
        }

        if (activeBookmark.groupId === overBookmark.groupId) {
          const groupBookmarks = current.bookmarks
            .filter((bookmark) => bookmark.groupId === activeBookmark.groupId)
            .sort((left, right) => left.order - right.order)
          const oldIndex = groupBookmarks.findIndex((bookmark) => bookmark.id === activeBookmarkId)
          const newIndex = groupBookmarks.findIndex((bookmark) => bookmark.id === overBookmarkId)

          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
            return current
          }

          const reorderedBookmarks = arrayMove(groupBookmarks, oldIndex, newIndex).map(
            (bookmark, index) => ({
              ...bookmark,
              order: index,
            }),
          )

          return {
            ...current,
            bookmarks: [
              ...current.bookmarks.filter((bookmark) => bookmark.groupId !== activeBookmark.groupId),
              ...reorderedBookmarks,
            ],
          }
        }

        return moveBookmarkPreview(current, activeBookmark, overBookmark.groupId, overBookmark.id)
      }

      const targetGroupId = String(event.over?.id)

      return moveBookmarkPreview(current, activeBookmark, targetGroupId)
    })
  }

  function moveBookmarkPreview(
    current: DashboardData,
    activeBookmark: Bookmark,
    targetGroupId: string,
    beforeBookmarkId?: string,
  ) {
    const targetGroupExists = current.groups.some((group) => group.id === targetGroupId)

    if (!targetGroupExists) {
      return current
    }

    const sourceGroupId = activeBookmark.groupId
    const targetBookmarks = current.bookmarks
      .filter((bookmark) => bookmark.groupId === targetGroupId && bookmark.id !== activeBookmark.id)
      .sort((left, right) => left.order - right.order)
    const requestedIndex = beforeBookmarkId
      ? targetBookmarks.findIndex((bookmark) => bookmark.id === beforeBookmarkId)
      : targetBookmarks.length
    const safeIndex = Math.max(
      0,
      Math.min(requestedIndex === -1 ? targetBookmarks.length : requestedIndex, targetBookmarks.length),
    )

    targetBookmarks.splice(safeIndex, 0, {
      ...activeBookmark,
      groupId: targetGroupId,
    })

    const reorderedTargetBookmarks = targetBookmarks.map((bookmark, index) => ({
      ...bookmark,
      order: index,
    }))
    const reorderedSourceBookmarks =
      sourceGroupId === targetGroupId
        ? []
        : current.bookmarks
            .filter((bookmark) => bookmark.groupId === sourceGroupId && bookmark.id !== activeBookmark.id)
            .sort((left, right) => left.order - right.order)
            .map((bookmark, index) => ({
              ...bookmark,
              order: index,
            }))

    return {
      ...current,
      bookmarks: [
        ...current.bookmarks.filter(
          (bookmark) => bookmark.groupId !== sourceGroupId && bookmark.groupId !== targetGroupId,
        ),
        ...reorderedSourceBookmarks,
        ...reorderedTargetBookmarks,
      ],
    }
  }

  function handleDragCancel() {
    setDraggingGroupId(null)
    setDraggingBookmarkId(null)

    if (dragStartDataRef.current) {
      setDashboardData(dragStartDataRef.current)
    }

    dragStartDataRef.current = null
  }

  async function handleGroupDragEnd(event: DragEndEvent) {
    const dragType = event.active.data.current?.type

    setDraggingGroupId(null)
    setDraggingBookmarkId(null)

    if (dragType === 'bookmark') {
      await handleBookmarkDragEnd(event)
      dragStartDataRef.current = null
      return
    }

    if (dragType !== 'group') {
      dragStartDataRef.current = null
      return
    }

    const activeGroupId = String(event.active.id)

    if (!groups.some((group) => group.id === activeGroupId)) {
      dragStartDataRef.current = null
      return
    }

    const nextData = await reorderGroups(groups.map((group) => group.id))
    setDashboardData(nextData)
    dragStartDataRef.current = null
  }

  async function handleBookmarkDragEnd(event: DragEndEvent) {
    const activeBookmarkId = String(event.active.id)
    const activeBookmark = bookmarks.find((bookmark) => bookmark.id === activeBookmarkId)

    if (!activeBookmark) {
      return
    }

    const groupBookmarks = bookmarks
      .filter((bookmark) => bookmark.groupId === activeBookmark.groupId)
      .sort((left, right) => left.order - right.order)
    const targetIndex = groupBookmarks.findIndex((bookmark) => bookmark.id === activeBookmarkId)

    if (targetIndex === -1) {
      return
    }

    const nextData = await moveBookmark(activeBookmarkId, activeBookmark.groupId, targetIndex)
    setDashboardData(nextData)
  }

  const locked = dashboardData?.settings.locked ?? true
  const groups = dashboardData?.groups ?? []
  const bookmarks = dashboardData?.bookmarks ?? []
  const isQuickSaveForm = isQuickSaveIntent && isBookmarkFormOpen && !editingBookmarkId

  const allTags = Array.from(new Set(bookmarks.flatMap((bookmark) => bookmark.tags))).sort(
    (left, right) => left.localeCompare(right),
  )

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Chrome New Tab Extension</p>
          <h1>Personal Bookmark Dashboard</h1>
          <p className="hero-copy">
            A minimal dark dashboard scaffold with fixed group cards, searchable bookmark rows,
            and a persisted lock toggle.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className={`lock-button ${locked ? 'is-locked' : 'is-unlocked'}`}
            onClick={toggleLocked}
            type="button"
          >
            {locked ? 'Locked layout' : 'Unlocked layout'}
          </button>

          <button
            className="secondary-button"
            type="button"
            disabled={!dashboardData}
            onClick={() => {
              void handleExportBackup()
            }}
          >
            Export JSON
          </button>

          <button
            className="secondary-button"
            type="button"
            disabled={!dashboardData}
            onClick={openImportPicker}
          >
            Import JSON
          </button>

          <button
            className="secondary-button"
            type="button"
            disabled={!dashboardData}
            onClick={() => {
              setIsAddingGroup(true)
              setEditingGroupId(null)
              setIsBookmarkFormOpen(false)
              setEditingBookmarkId(null)
              setGroupName('')
              setFormError(null)
            }}
          >
            Add group
          </button>

          <button
            className="secondary-button"
            type="button"
            disabled={!dashboardData}
            onClick={() => openAddBookmark()}
          >
            Add bookmark
          </button>
        </div>

        <input
          accept="application/json,.json"
          className="visually-hidden"
          onChange={handleImportFile}
          ref={importInputRef}
          type="file"
        />
      </header>

      {statusMessage ? <p className="status-note">{statusMessage}</p> : null}

      {isAddingGroup || editingGroupId ? (
        <section className="form-panel" aria-label={editingGroupId ? 'Edit group' : 'Add group'}>
          <form className="quick-form" onSubmit={handleCreateGroup}>
            <div>
              <p className="form-eyebrow">{editingGroupId ? 'Edit Group' : 'New Group'}</p>
              <h2>{editingGroupId ? 'Rename group' : 'Add a bookmark group'}</h2>
            </div>

            <label>
              <span>Group name</span>
              <input
                autoFocus
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Design, Admin, Reading..."
              />
            </label>

            {formError ? <p className="form-error">{formError}</p> : null}

            <div className="form-actions">
              {editingGroupId ? (
                <button className="danger-button" type="button" onClick={handleDeleteGroup}>
                  Delete group and bookmarks
                </button>
              ) : null}
              <button className="secondary-button" type="button" onClick={closeForms}>
                Cancel
              </button>
              <button className="lock-button is-unlocked" type="submit">
                {editingGroupId ? 'Save changes' : 'Save group'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {isBookmarkFormOpen ? (
        <section className="form-panel" aria-label={editingBookmarkId ? 'Edit bookmark' : 'Add bookmark'}>
          <form className="quick-form" onSubmit={handleCreateBookmark}>
            <div>
              <p className="form-eyebrow">
                {editingBookmarkId ? 'Edit Bookmark' : isQuickSaveForm ? 'Quick Save' : 'New Bookmark'}
              </p>
              <h2>
                {editingBookmarkId
                  ? 'Update bookmark'
                  : isQuickSaveForm
                    ? 'Save current page'
                    : 'Add a bookmark'}
              </h2>
            </div>

            <label>
              <span>Group</span>
              <input
                autoFocus={isQuickSaveForm}
                required
                list="bookmark-group-options"
                value={bookmarkGroupName}
                onChange={(event) => setBookmarkGroupName(event.target.value)}
                placeholder="Type an existing or new group"
              />
              <datalist id="bookmark-group-options">
                {groups.map((group) => (
                  <option key={group.id} value={group.name} />
                ))}
              </datalist>
            </label>

            <label>
              <span>Name</span>
              <input
                value={bookmarkName}
                onChange={(event) => setBookmarkName(event.target.value)}
                placeholder="Optional, falls back to URL"
              />
            </label>

            <label>
              <span>URL</span>
              <input
                autoFocus={!isQuickSaveForm}
                value={bookmarkUrl}
                onChange={(event) => setBookmarkUrl(event.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </label>

            <label>
              <span>Tags</span>
              <input
                value={bookmarkTags}
                onChange={(event) => setBookmarkTags(event.target.value)}
                placeholder="docs, tools, design"
              />
            </label>

            {allTags.length > 0 ? (
              <div className="tag-picker" aria-label="Existing tags">
                <span>Existing tags</span>
                <div className="tag-picker-list">
                  {allTags.map((tag) => {
                    const isSelected = parseTagInput(bookmarkTags).includes(tag)

                    return (
                      <button
                        key={tag}
                        className={`tag-chip tag-picker-chip ${isSelected ? 'is-active' : ''}`}
                        type="button"
                        onClick={() => toggleBookmarkTag(tag)}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {formError ? <p className="form-error">{formError}</p> : null}

            <div className="form-actions">
              {editingBookmarkId ? (
                <button className="danger-button" type="button" onClick={handleDeleteBookmark}>
                  Delete
                </button>
              ) : null}
              <button className="secondary-button" type="button" onClick={closeForms}>
                Cancel
              </button>
              <button className="lock-button is-unlocked" type="submit">
                {editingBookmarkId ? 'Save changes' : 'Save bookmark'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="toolbar">
        <label className="search-field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Search by name or URL"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="tag-panel">
          <button
            className={`tag-chip ${selectedTag === null ? 'is-active' : ''}`}
            onClick={() => setSelectedTag(null)}
            type="button"
          >
            All tags
          </button>

          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-chip ${selectedTag === tag ? 'is-active' : ''}`}
              onClick={() => setSelectedTag(tag)}
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {!dashboardData ? (
        <main className="loading-state">Loading dashboard data...</main>
      ) : (
        <DndContext
          collisionDetection={dashboardCollisionDetection}
          onDragCancel={handleDragCancel}
          onDragEnd={(event) => {
            void handleGroupDragEnd(event)
          }}
          onDragOver={handleDragOver}
          onDragStart={handleGroupDragStart}
          sensors={sensors}
        >
          <SortableContext items={groups.map((group) => group.id)} strategy={rectSortingStrategy}>
            <main className="group-grid">
              {groups.map((group) => {
                const groupBookmarks = bookmarks
                  .filter((bookmark) => bookmark.groupId === group.id)
                  .sort((left, right) => left.order - right.order)

                return (
                  <SortableGroupCard
                    group={group}
                    bookmarkSortingDisabled={Boolean(draggingGroupId)}
                    groupBookmarks={groupBookmarks}
                    groupSortingDisabled={Boolean(draggingBookmarkId)}
                    key={group.id}
                    locked={locked}
                    onAddBookmark={openAddBookmark}
                    onEditBookmark={openEditBookmark}
                    onEditGroup={openEditGroup}
                    onOpenGroupBookmarks={openGroupBookmarks}
                    search={search}
                    selectedTag={selectedTag}
                  />
                )
              })}
            </main>
          </SortableContext>

          <DragOverlay adjustScale={false} dropAnimation={draggingGroupId ? null : undefined}>
            {draggingGroupId ? (
              (() => {
                const activeGroup = groups.find((group) => group.id === draggingGroupId)

                if (!activeGroup) {
                  return null
                }

                const activeGroupBookmarks = bookmarks
                  .filter((bookmark) => bookmark.groupId === activeGroup.id)
                  .sort((left, right) => left.order - right.order)

                return (
                  <section className="group-card group-drag-preview">
                    <GroupCardContent
                      group={activeGroup}
                      bookmarkSortingDisabled
                      groupBookmarks={activeGroupBookmarks}
                      locked={locked}
                      onAddBookmark={openAddBookmark}
                      onEditBookmark={openEditBookmark}
                      onEditGroup={openEditGroup}
                      onOpenGroupBookmarks={openGroupBookmarks}
                      search={search}
                      selectedTag={selectedTag}
                    />
                  </section>
                )
              })()
            ) : draggingBookmarkId ? (
              (() => {
                const activeBookmark = bookmarks.find((bookmark) => bookmark.id === draggingBookmarkId)

                if (!activeBookmark) {
                  return null
                }

                return (
                  <div className="bookmark-row bookmark-drag-preview">
                    <BookmarkRow
                      bookmark={activeBookmark}
                      onEditBookmark={openEditBookmark}
                      visible
                    />
                  </div>
                )
              })()
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
