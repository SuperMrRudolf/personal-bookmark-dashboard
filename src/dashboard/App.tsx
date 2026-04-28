import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/700.css'
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
  type DragMoveEvent,
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
  parseDashboardBackup,
  saveDashboardData,
  updateBookmark,
  updateGroup,
} from '../lib/storage'
import type { Bookmark, BookmarkGroup, DashboardData } from '../lib/types'

type TagFilterMode = 'and' | 'or'

type UndoDeleteToast = {
  message: string
  restoreData: DashboardData
}

function matchesBookmark(
  query: string,
  selectedTags: string[],
  tagFilterMode: TagFilterMode,
  bookmark: Bookmark,
) {
  const normalizedQuery = query.trim().toLowerCase()
  const queryMatch =
    normalizedQuery.length === 0 ||
    bookmark.name.toLowerCase().includes(normalizedQuery) ||
    bookmark.url.toLowerCase().includes(normalizedQuery)
  const tagMatch =
    selectedTags.length === 0 ||
    (tagFilterMode === 'and'
      ? selectedTags.every((tag) => bookmark.tags.includes(tag))
      : selectedTags.some((tag) => bookmark.tags.includes(tag)))

  return queryMatch && tagMatch
}

function getDisplayHostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function buildFaviconUrl(domainOrUrl: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domainOrUrl)}&sz=64`
}

function getLocalAssetUrl(path: string) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path)
  }

  return `/${path}`
}

type BookmarkIconRule = {
  hostname: string
  pathnameStartsWith?: string
  iconSrc: string
}

const bookmarkIconRules: BookmarkIconRule[] = [
  { hostname: 'mail.google.com', iconSrc: getLocalAssetUrl('app-icons/gmail.png') },
  { hostname: 'drive.google.com', iconSrc: getLocalAssetUrl('app-icons/google-drive.png') },
  { hostname: 'photos.google.com', iconSrc: getLocalAssetUrl('app-icons/google-photos.ico') },
  { hostname: 'calendar.google.com', iconSrc: getLocalAssetUrl('app-icons/google-calendar.png') },
  { hostname: 'keep.google.com', iconSrc: getLocalAssetUrl('app-icons/google-keep.png') },
  { hostname: 'meet.google.com', iconSrc: getLocalAssetUrl('app-icons/google-meet.png') },
  { hostname: 'chat.google.com', iconSrc: buildFaviconUrl('chat.google.com') },
  { hostname: 'docs.google.com', pathnameStartsWith: '/spreadsheets', iconSrc: getLocalAssetUrl('app-icons/google-sheets.png') },
  { hostname: 'docs.google.com', pathnameStartsWith: '/document', iconSrc: getLocalAssetUrl('app-icons/google-docs.png') },
  { hostname: 'docs.google.com', pathnameStartsWith: '/presentation', iconSrc: getLocalAssetUrl('app-icons/google-slides.png') },
  { hostname: 'docs.google.com', pathnameStartsWith: '/forms', iconSrc: getLocalAssetUrl('app-icons/google-forms.png') },
  { hostname: 'gemini.google.com', iconSrc: buildFaviconUrl('gemini.google.com') },
  { hostname: 'chat.openai.com', iconSrc: buildFaviconUrl('chat.openai.com') },
  { hostname: 'chatgpt.com', iconSrc: buildFaviconUrl('chat.openai.com') },
  { hostname: 'openai.com', iconSrc: buildFaviconUrl('openai.com') },
  { hostname: 'www.youtube.com', iconSrc: getLocalAssetUrl('app-icons/youtube.ico') },
  { hostname: 'music.youtube.com', iconSrc: getLocalAssetUrl('app-icons/youtube-music.ico') },
  { hostname: 'www.whatsapp.com', iconSrc: getLocalAssetUrl('app-icons/whatsapp.ico') },
  { hostname: 'web.whatsapp.com', iconSrc: getLocalAssetUrl('app-icons/whatsapp-web.ico') },
  { hostname: 'telegram.org', iconSrc: getLocalAssetUrl('app-icons/telegram.ico') },
  { hostname: 'desktop.telegram.org', iconSrc: getLocalAssetUrl('app-icons/telegram-desktop.ico') },
  { hostname: 'signal.org', iconSrc: buildFaviconUrl('signal.org') },
  { hostname: 'www.wechat.com', iconSrc: getLocalAssetUrl('app-icons/wechat.ico') },
  { hostname: 'web.wechat.com', iconSrc: buildFaviconUrl('web.wechat.com') },
  { hostname: 'www.twitch.tv', iconSrc: getLocalAssetUrl('app-icons/twitch.ico') },
  { hostname: 'www.skype.com', iconSrc: buildFaviconUrl('www.skype.com') },
  { hostname: 'teams.microsoft.com', iconSrc: getLocalAssetUrl('app-icons/microsoft-teams.ico') },
  { hostname: 'www.tumblr.com', iconSrc: getLocalAssetUrl('app-icons/tumblr.ico') },
  { hostname: 'www.quora.com', iconSrc: getLocalAssetUrl('app-icons/quora.ico') },
  { hostname: 'discord.com', iconSrc: buildFaviconUrl('discord.com') },
  { hostname: 'slack.com', iconSrc: getLocalAssetUrl('app-icons/slack.ico') },
  { hostname: 'www.pinterest.com', iconSrc: getLocalAssetUrl('app-icons/pinterest.ico') },
  { hostname: 'www.tiktok.com', iconSrc: getLocalAssetUrl('app-icons/tiktok.ico') },
  { hostname: 'www.snapchat.com', iconSrc: getLocalAssetUrl('app-icons/snapchat.ico') },
  { hostname: 'reddit.com', iconSrc: getLocalAssetUrl('app-icons/reddit.ico') },
  { hostname: 'www.reddit.com', iconSrc: getLocalAssetUrl('app-icons/reddit.ico') },
  { hostname: 'www.linkedin.com', iconSrc: getLocalAssetUrl('app-icons/linkedin.ico') },
  { hostname: 'www.facebook.com', iconSrc: getLocalAssetUrl('app-icons/facebook.ico') },
  { hostname: 'www.instagram.com', iconSrc: getLocalAssetUrl('app-icons/instagram.ico') },
  { hostname: 'twitter.com', iconSrc: getLocalAssetUrl('app-icons/twitter.ico') },
  { hostname: 'x.com', iconSrc: getLocalAssetUrl('app-icons/twitter.ico') },
  { hostname: 'www.messenger.com', iconSrc: buildFaviconUrl('www.messenger.com') },
  { hostname: 'www.threads.net', iconSrc: getLocalAssetUrl('app-icons/threads.ico') },
  { hostname: 'zoom.us', iconSrc: getLocalAssetUrl('app-icons/zoom.ico') },
  { hostname: 'claude.ai', iconSrc: getLocalAssetUrl('app-icons/claude.ico') },
  { hostname: 'www.midjourney.com', iconSrc: buildFaviconUrl('www.midjourney.com') },
  { hostname: 'www.perplexity.ai', iconSrc: getLocalAssetUrl('app-icons/perplexity.ico') },
  { hostname: 'perplexity.ai', iconSrc: getLocalAssetUrl('app-icons/perplexity.ico') },
  { hostname: 'beta.character.ai', iconSrc: getLocalAssetUrl('app-icons/character-ai.ico') },
  { hostname: 'stability.ai', iconSrc: getLocalAssetUrl('app-icons/stability-ai.ico') },
  { hostname: 'huggingface.co', iconSrc: getLocalAssetUrl('app-icons/hugging-face.ico') },
  { hostname: 'cohere.com', iconSrc: getLocalAssetUrl('app-icons/cohere.ico') },
  { hostname: 'www.jasper.ai', iconSrc: buildFaviconUrl('www.jasper.ai') },
  { hostname: 'www.copy.ai', iconSrc: buildFaviconUrl('www.copy.ai') },
  { hostname: 'mistral.ai', iconSrc: getLocalAssetUrl('app-icons/mistral-ai.ico') },
  { hostname: 'replika.ai', iconSrc: getLocalAssetUrl('app-icons/replika.ico') },
  { hostname: 'x.ai', iconSrc: getLocalAssetUrl('app-icons/xai.ico') },
  { hostname: 'www.ibm.com', pathnameStartsWith: '/watson', iconSrc: buildFaviconUrl('www.ibm.com') },
  { hostname: 'lex.page', iconSrc: getLocalAssetUrl('app-icons/lex.ico') },
  { hostname: 'app.writesonic.com', iconSrc: getLocalAssetUrl('app-icons/chatsonic.ico') },
  { hostname: 'www.deepl.com', iconSrc: getLocalAssetUrl('app-icons/deepl.ico') },
  { hostname: 'poe.com', iconSrc: getLocalAssetUrl('app-icons/poe.ico') },
  { hostname: 'open-assistant.io', iconSrc: buildFaviconUrl('open-assistant.io') },
  { hostname: 'runwayml.com', iconSrc: buildFaviconUrl('runwayml.com') },
  { hostname: 'firefly.adobe.com', iconSrc: buildFaviconUrl('firefly.adobe.com') },
  { hostname: 'www.notion.so', iconSrc: buildFaviconUrl('www.notion.so') },
  { hostname: 'www.figma.com', iconSrc: buildFaviconUrl('www.figma.com') },
  { hostname: 'miro.com', iconSrc: buildFaviconUrl('miro.com') },
  { hostname: 'trello.com', iconSrc: buildFaviconUrl('trello.com') },
  { hostname: 'asana.com', iconSrc: buildFaviconUrl('asana.com') },
  { hostname: 'github.com', iconSrc: buildFaviconUrl('github.com') },
  { hostname: 'gitlab.com', iconSrc: buildFaviconUrl('gitlab.com') },
  { hostname: 'bitbucket.org', iconSrc: buildFaviconUrl('bitbucket.org') },
]

function getBookmarkIconSources(url: string) {
  const fallbackSrc = buildFaviconUrl(getDisplayHostname(url))

  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()
    const pathname = parsedUrl.pathname.toLowerCase()
    const matchedRule = bookmarkIconRules.find(
      (rule) =>
        rule.hostname === hostname &&
        (!rule.pathnameStartsWith || pathname.startsWith(rule.pathnameStartsWith)),
    )

    if (matchedRule) {
      return {
        src: matchedRule.iconSrc,
        fallbackSrc,
      }
    }
  } catch {
    return { src: fallbackSrc, fallbackSrc }
  }

  return { src: fallbackSrc, fallbackSrc }
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

let lastPointerCoordinates: { x: number; y: number } | null = null

const dashboardCollisionDetection: CollisionDetection = (args) => {
  lastPointerCoordinates = args.pointerCoordinates ?? null
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

  const bookmarkContainers = droppableContainers.filter(
    (container) => container.data.current?.type === 'bookmark',
  )
  const groupContainers = droppableContainers.filter(
    (container) => container.data.current?.type === 'group',
  )
  const groupPointerCollisions = pointerWithin({
    ...args,
    droppableContainers: groupContainers,
  })

  if (groupPointerCollisions.length > 0) {
    const targetGroupId = String(groupPointerCollisions[0].id)
    const targetGroupBookmarkContainers = bookmarkContainers.filter(
      (container) => container.data.current?.bookmark?.groupId === targetGroupId,
    )
    const bookmarkCollisions = closestCenter({
      ...args,
      droppableContainers: targetGroupBookmarkContainers,
    })

    if (bookmarkCollisions.length > 0) {
      return bookmarkCollisions
    }

    return groupPointerCollisions
  }

  return []
}

type GroupCardContentProps = {
  group: BookmarkGroup
  groupBookmarks: Bookmark[]
  locked: boolean
  bookmarkSortingDisabled: boolean
  suppressBookmarkTransforms: boolean
  search: string
  selectedTags: string[]
  tagFilterMode: TagFilterMode
  onEditGroup: (group: BookmarkGroup) => void
  onEditBookmark: (bookmark: Bookmark) => void
  onOpenGroupBookmarks: (bookmarks: Bookmark[]) => void
}

function GroupCardContent({
  group,
  groupBookmarks,
  locked,
  bookmarkSortingDisabled,
  suppressBookmarkTransforms,
  search,
  selectedTags,
  tagFilterMode,
  onEditGroup,
  onEditBookmark,
  onOpenGroupBookmarks,
}: GroupCardContentProps) {
  return (
    <>
      <div className="group-header">
        <div>
          <div className="group-title">
            <h2>{group.name}</h2>
          </div>
        </div>
        <div className="group-actions">
          {groupBookmarks.length > 0 ? (
            <button
              className="open-all-button"
              type="button"
              onClick={() => onOpenGroupBookmarks(groupBookmarks)}
            >
              Open all
            </button>
          ) : null}
          {!locked ? (
            <button className="group-edit-button" type="button" onClick={() => onEditGroup(group)}>
              Edit group
            </button>
          ) : null}
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
              selectedTags={selectedTags}
              tagFilterMode={tagFilterMode}
              suppressTransform={suppressBookmarkTransforms}
            />
          ))}

          {groupBookmarks.length === 0 ? (
            <p className="group-empty">No bookmarks yet.</p>
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
      data-group-id={props.group.id}
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
  selectedTags: string[]
  tagFilterMode: TagFilterMode
  onEditBookmark: (bookmark: Bookmark) => void
  suppressTransform: boolean
}

function BookmarkRow({
  bookmark,
  visible,
  locked,
  onEditBookmark,
}: {
  bookmark: Bookmark
  visible: boolean
  locked: boolean
  onEditBookmark: (bookmark: Bookmark) => void
}) {
  const { src, fallbackSrc } = getBookmarkIconSources(bookmark.url)

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
          src={src}
          onError={(event) => {
            if (event.currentTarget.src === fallbackSrc) {
              return
            }

            event.currentTarget.onerror = null
            event.currentTarget.src = fallbackSrc
          }}
        />

        <div className="bookmark-copy">
          <span className="bookmark-name">{bookmark.name}</span>
        </div>
      </a>

      {!locked ? (
        <button
          className="bookmark-edit"
          type="button"
          tabIndex={visible ? 0 : -1}
          onClick={() => onEditBookmark(bookmark)}
        >
          Edit
        </button>
      ) : null}
    </>
  )
}

function SortableBookmarkRow({
  bookmark,
  locked,
  search,
  selectedTags,
  tagFilterMode,
  onEditBookmark,
  suppressTransform,
}: SortableBookmarkRowProps) {
  const visible = matchesBookmark(search, selectedTags, tagFilterMode, bookmark)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id,
    disabled: locked || !visible,
    data: {
      bookmark,
      type: 'bookmark',
    },
  })
  const style = {
    transform: suppressTransform ? undefined : CSS.Transform.toString(transform),
    transition: suppressTransform ? undefined : transition,
  }

  return (
    <div
      className={`bookmark-row ${visible ? '' : 'is-hidden'} ${locked || !visible ? '' : 'is-sortable'} ${isDragging ? 'is-dragging' : ''}`}
      data-bookmark-id={bookmark.id}
      key={bookmark.id}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <BookmarkRow
        bookmark={bookmark}
        locked={locked}
        visible={visible}
        onEditBookmark={onEditBookmark}
      />
    </div>
  )
}

export function App() {
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>('and')
  const [isSearchSidebarOpen, setIsSearchSidebarOpen] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [isBookmarkFormOpen, setIsBookmarkFormOpen] = useState(false)
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [bookmarkGroupName, setBookmarkGroupName] = useState('')
  const [bookmarkName, setBookmarkName] = useState('')
  const [bookmarkUrl, setBookmarkUrl] = useState('')
  const [bookmarkTags, setBookmarkTags] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [undoDeleteToast, setUndoDeleteToast] = useState<UndoDeleteToast | null>(null)
  const [isQuickSaveIntent, setIsQuickSaveIntent] = useState(hasQuickSaveIntent)
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
  const [draggingBookmarkId, setDraggingBookmarkId] = useState<string | null>(null)
  const dragStartDataRef = useRef<DashboardData | null>(null)
  const latestDashboardDataRef = useRef<DashboardData | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const actionMenuRef = useRef<HTMLDivElement | null>(null)
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
    latestDashboardDataRef.current = dashboardData
  }, [dashboardData])

  useEffect(() => {
    if (!undoDeleteToast) {
      return
    }

    const timeoutId = window.setTimeout(() => setUndoDeleteToast(null), 7000)

    return () => window.clearTimeout(timeoutId)
  }, [undoDeleteToast])

  useEffect(() => {
    if (!isActionMenuOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target

      if (target instanceof Node && actionMenuRef.current?.contains(target)) {
        return
      }

      setIsActionMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isActionMenuOpen])

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
    } catch {
      setStatusMessage('Backup export failed.')
    }
  }

  function openImportPicker() {
    setIsActionMenuOpen(false)
    importInputRef.current?.click()
  }

  function openShortcutSettings() {
    setIsActionMenuOpen(false)

    const shortcutUrl = 'chrome://extensions/shortcuts'

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      void chrome.tabs.create({ url: shortcutUrl })
      return
    }

    window.open(shortcutUrl, '_blank', 'noopener,noreferrer')
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
      setSelectedTags([])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.'

      setStatusMessage(message)
    }
  }

  function closeForms() {
    clearQuickSaveIntentState()
    setIsActionMenuOpen(false)
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

  function showUndoDeleteToast(message: string, restoreData: DashboardData) {
    setUndoDeleteToast({ message, restoreData })
  }

  async function undoDelete() {
    if (!undoDeleteToast) {
      return
    }

    await saveDashboardData(undoDeleteToast.restoreData)
    setDashboardData(undoDeleteToast.restoreData)
    setUndoDeleteToast(null)
  }

  function openAddBookmark(initialGroupName = '') {
    setIsActionMenuOpen(false)
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

    setIsActionMenuOpen(false)
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
    setIsActionMenuOpen(false)
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

  function toggleSelectedTag(tag: string) {
    setSelectedTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag],
    )
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
      'Delete this group and all bookmarks inside it? You can undo this right after deleting.',
    )

    if (!confirmed) {
      return
    }

    const restoreData = dashboardData
    const deletedGroup = groups.find((group) => group.id === editingGroupId)
    const nextData = await deleteGroup(editingGroupId)
    setDashboardData(nextData)
    closeForms()

    if (restoreData) {
      showUndoDeleteToast(`Deleted ${deletedGroup?.name ?? 'group'}.`, restoreData)
    }
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

    const confirmed = window.confirm('Delete this bookmark? You can undo this right after deleting.')

    if (!confirmed) {
      return
    }

    const restoreData = dashboardData
    const deletedBookmark = bookmarks.find((bookmark) => bookmark.id === editingBookmarkId)
    const nextData = await deleteBookmark(editingBookmarkId)
    setDashboardData(nextData)
    closeForms()

    if (restoreData) {
      showUndoDeleteToast(`Deleted ${deletedBookmark?.name ?? 'bookmark'}.`, restoreData)
    }
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

  function handleDragStart(event: DragStartEvent) {
    const dragType = event.active.data.current?.type

    dragStartDataRef.current = latestDashboardDataRef.current ?? dashboardData

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

  function handleDragMove(event: DragMoveEvent) {
    const dragType = event.active.data.current?.type

    if (dragType === 'bookmark') {
      previewBookmarkReorder(event)
    }
  }

  function getOverGroupId(event: DragOverEvent) {
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

      const nextData = {
        ...current,
        groups: arrayMove(current.groups, oldIndex, newIndex).map((group, index) => ({
          ...group,
          order: index,
        })),
      }

      latestDashboardDataRef.current = nextData
      return nextData
    })
  }

  function previewBookmarkReorder(event: DragOverEvent | DragMoveEvent) {
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
      const originalBookmark = dragStartDataRef.current?.bookmarks.find(
        (bookmark) => bookmark.id === activeBookmarkId,
      )

      if (!activeBookmark) {
        return current
      }

      const originalGroupId = originalBookmark?.groupId ?? activeBookmark.groupId
      const projection = projectCrossGroupBookmarkMove(current, activeBookmark, originalGroupId)

      if (!projection) {
        return current
      }

      latestDashboardDataRef.current = projection
      return projection
    })
  }

  function projectCrossGroupBookmarkMove(
    current: DashboardData,
    activeBookmark: Bookmark,
    originalGroupId: string,
  ) {
    const pointer = lastPointerCoordinates

    if (!pointer) {
      return null
    }

    const targetGroupElement = document
      .elementsFromPoint(pointer.x, pointer.y)
      .map((element) =>
        element instanceof HTMLElement
          ? element.closest<HTMLElement>('[data-group-id]')
          : null,
      )
      .find((element): element is HTMLElement => Boolean(element))
    const targetGroupId = targetGroupElement?.dataset.groupId

    if (!targetGroupId) {
      return null
    }

    if (targetGroupId === originalGroupId && activeBookmark.groupId === originalGroupId) {
      return null
    }

    const targetGroupExists = current.groups.some((group) => group.id === targetGroupId)

    if (!targetGroupExists) {
      return null
    }

    const targetIndex = getTargetBookmarkIndex(targetGroupElement, activeBookmark.id, pointer.y)

    return moveBookmarkToIndex(current, activeBookmark, targetGroupId, targetIndex)
  }

  function getTargetBookmarkIndex(
    targetGroupElement: HTMLElement,
    activeBookmarkId: string,
    pointerY: number,
  ) {
    const rowElements = Array.from(
      targetGroupElement.querySelectorAll<HTMLElement>('.bookmark-row[data-bookmark-id]:not(.is-hidden)'),
    ).filter((rowElement) => rowElement.dataset.bookmarkId !== activeBookmarkId)

    return rowElements.findIndex((rowElement) => {
      const rect = rowElement.getBoundingClientRect()

      return pointerY < rect.top + rect.height / 2
    })
  }

  function moveBookmarkToIndex(
    current: DashboardData,
    activeBookmark: Bookmark,
    targetGroupId: string,
    targetIndex: number,
  ) {
    const sourceGroupId = activeBookmark.groupId
    const currentTargetBookmarks = current.bookmarks
      .filter((bookmark) => bookmark.groupId === targetGroupId)
      .sort((left, right) => left.order - right.order)
    const targetBookmarks = current.bookmarks
      .filter((bookmark) => bookmark.groupId === targetGroupId && bookmark.id !== activeBookmark.id)
      .sort((left, right) => left.order - right.order)
    const safeIndex = Math.max(
      0,
      Math.min(targetIndex === -1 ? targetBookmarks.length : targetIndex, targetBookmarks.length),
    )
    const currentIndex = currentTargetBookmarks.findIndex(
      (bookmark) => bookmark.id === activeBookmark.id,
    )

    if (sourceGroupId === targetGroupId && currentIndex === safeIndex) {
      return null
    }

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
      latestDashboardDataRef.current = dragStartDataRef.current
      setDashboardData(dragStartDataRef.current)
    }

    dragStartDataRef.current = null
  }

  async function handleDragEnd(event: DragEndEvent) {
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

    if (!event.over) {
      if (dragStartDataRef.current) {
        latestDashboardDataRef.current = dragStartDataRef.current
        setDashboardData(dragStartDataRef.current)
      }

      dragStartDataRef.current = null
      return
    }

    const currentData = latestDashboardDataRef.current
    const activeGroupId = String(event.active.id)

    if (!currentData?.groups.some((group) => group.id === activeGroupId)) {
      dragStartDataRef.current = null
      return
    }

    await saveDashboardData(currentData)
    dragStartDataRef.current = null
  }

  async function handleBookmarkDragEnd(event: DragEndEvent) {
    const over = event.over
    const currentData = latestDashboardDataRef.current
    const activeBookmarkId = String(event.active.id)
    const previewBookmark = currentData?.bookmarks.find((bookmark) => bookmark.id === activeBookmarkId)
    const originalBookmark = dragStartDataRef.current?.bookmarks.find(
      (bookmark) => bookmark.id === activeBookmarkId,
    )
    const originalGroupId = originalBookmark?.groupId ?? previewBookmark?.groupId
    const hasPreviewMovedAcrossGroups =
      Boolean(previewBookmark) &&
      Boolean(originalGroupId) &&
      previewBookmark?.groupId !== originalGroupId

    if (!over) {
      if (hasPreviewMovedAcrossGroups && currentData) {
        latestDashboardDataRef.current = currentData
        setDashboardData(currentData)
        await saveDashboardData(currentData)
        return
      }

      if (dragStartDataRef.current) {
        latestDashboardDataRef.current = dragStartDataRef.current
        setDashboardData(dragStartDataRef.current)
      }

      return
    }

    const activeBookmark = previewBookmark
    const overType = over.data.current?.type

    if (!activeBookmark || !currentData) {
      return
    }

    if (hasPreviewMovedAcrossGroups) {
      latestDashboardDataRef.current = currentData
      setDashboardData(currentData)
      await saveDashboardData(currentData)
      return
    }

    if (overType === 'bookmark') {
      const overBookmarkId = String(over.id)
      const overBookmark = currentData.bookmarks.find((bookmark) => bookmark.id === overBookmarkId)

      if (overBookmark && activeBookmark.groupId === overBookmark.groupId) {
        const groupBookmarks = currentData.bookmarks
          .filter((bookmark) => bookmark.groupId === activeBookmark.groupId)
          .sort((left, right) => left.order - right.order)
        const oldIndex = groupBookmarks.findIndex((bookmark) => bookmark.id === activeBookmarkId)
        const newIndex = groupBookmarks.findIndex((bookmark) => bookmark.id === overBookmarkId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reorderedBookmarks = arrayMove(groupBookmarks, oldIndex, newIndex).map(
            (bookmark, index) => ({
              ...bookmark,
              order: index,
            }),
          )
          const nextData = {
            ...currentData,
            bookmarks: [
              ...currentData.bookmarks.filter((bookmark) => bookmark.groupId !== activeBookmark.groupId),
              ...reorderedBookmarks,
            ],
          }

          latestDashboardDataRef.current = nextData
          setDashboardData(nextData)
          await saveDashboardData(nextData)
          return
        }
      }
    }

    await saveDashboardData(currentData)
  }

  const locked = dashboardData?.settings.locked ?? true
  const groups = dashboardData?.groups ?? []
  const bookmarks = dashboardData?.bookmarks ?? []
  const isQuickSaveForm = isQuickSaveIntent && isBookmarkFormOpen && !editingBookmarkId
  const draggingBookmark = draggingBookmarkId
    ? bookmarks.find((bookmark) => bookmark.id === draggingBookmarkId)
    : null
  const dragStartBookmark = draggingBookmarkId
    ? dragStartDataRef.current?.bookmarks.find((bookmark) => bookmark.id === draggingBookmarkId)
    : null
  const isCrossGroupBookmarkDrag = Boolean(
    draggingBookmark &&
      dragStartBookmark &&
      draggingBookmark.groupId !== dragStartBookmark.groupId,
  )
  const hasOpenForm = isAddingGroup || Boolean(editingGroupId) || isBookmarkFormOpen

  useEffect(() => {
    if (!hasOpenForm) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeForms()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasOpenForm])

  const tagCounts = bookmarks.reduce((counts, bookmark) => {
    bookmark.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))

    return counts
  }, new Map<string, number>())
  const allTags = Array.from(tagCounts.keys()).sort(
    (left, right) => (tagCounts.get(right) ?? 0) - (tagCounts.get(left) ?? 0) || left.localeCompare(right),
  )

  return (
    <div className="shell">
      <header className="hero">
        <div className="hero-lock-control">
          <button
            className={`lock-switch ${locked ? 'is-locked' : 'is-unlocked'}`}
            onClick={toggleLocked}
            role="switch"
            aria-checked={!locked}
            type="button"
          >
            <span>{locked ? 'Locked' : 'Unlocked'}</span>
            <span className="lock-switch-track" aria-hidden="true">
              <span className="lock-switch-thumb" />
            </span>
          </button>
        </div>

        <div className="hero-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={!dashboardData}
            onClick={() => {
              setIsActionMenuOpen(false)
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

          <div className="action-menu" ref={actionMenuRef}>
            <button
              className="menu-button"
              type="button"
              disabled={!dashboardData}
              aria-expanded={isActionMenuOpen}
              aria-label="Open dashboard menu"
              onClick={() => setIsActionMenuOpen((isOpen) => !isOpen)}
            >
              <span />
              <span />
              <span />
            </button>

            {isActionMenuOpen ? (
              <div className="menu-panel">
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false)
                    void handleExportBackup()
                  }}
                >
                  Export JSON
                </button>
                <button type="button" onClick={openImportPicker}>
                  Import JSON
                </button>
                <button type="button" onClick={openShortcutSettings}>
                  Shortcuts
                </button>
              </div>
            ) : null}
          </div>
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
        <div className="form-overlay" role="presentation">
          <section
            className="form-panel"
            aria-label={editingGroupId ? 'Edit group' : 'Add group'}
            aria-modal="true"
            role="dialog"
          >
            <form className="quick-form group-form" onSubmit={handleCreateGroup}>
              <div className="form-heading">
                <p className="form-eyebrow">{editingGroupId ? 'Edit Group' : 'New Group'}</p>
              </div>

              <label className="field-label">
                <input
                  autoFocus
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Type group name, e.g. Design, Admin, Reading..."
                />
              </label>

              {formError ? <p className="form-error">{formError}</p> : null}

              <div className="form-actions">
                {editingGroupId ? (
                  <button className="danger-link-button" type="button" onClick={handleDeleteGroup}>
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
        </div>
      ) : null}

      {isBookmarkFormOpen ? (
        <div className="form-overlay" role="presentation">
          <section
            className="form-panel"
            aria-label={editingBookmarkId ? 'Edit bookmark' : 'Add bookmark'}
            aria-modal="true"
            role="dialog"
          >
            <form className="quick-form bookmark-form" onSubmit={handleCreateBookmark}>
              <div className="form-heading">
                <p className="form-eyebrow">
                  {editingBookmarkId ? 'Edit Bookmark' : isQuickSaveForm ? 'Quick Save' : 'New Bookmark'}
                </p>
              </div>

              <label className="field-label">
                <span>Group</span>
                <input
                  autoFocus={isQuickSaveForm}
                  required
                  list="bookmark-group-options"
                  value={bookmarkGroupName}
                  onChange={(event) => setBookmarkGroupName(event.target.value)}
                  placeholder="Group, existing or new"
                />
                <datalist id="bookmark-group-options">
                  {groups.map((group) => (
                    <option key={group.id} value={group.name} />
                  ))}
                </datalist>
              </label>

              <label className="field-label">
                <span>Name</span>
                <input
                  value={bookmarkName}
                  onChange={(event) => setBookmarkName(event.target.value)}
                  placeholder="example.com"
                />
              </label>

              <label className="field-label">
                <span>URL</span>
                <input
                  autoFocus={!isQuickSaveForm}
                  value={bookmarkUrl}
                  onChange={(event) => setBookmarkUrl(event.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </label>

              <label className="field-label">
                <span>Tags</span>
                <input
                  value={bookmarkTags}
                  onChange={(event) => setBookmarkTags(event.target.value)}
                  placeholder="e.g. docs, tools, design"
                />
              </label>

              {allTags.length > 0 ? (
                <div className="tag-picker" aria-label="Existing tags">
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
                  <button className="danger-link-button" type="button" onClick={handleDeleteBookmark}>
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
        </div>
      ) : null}

      <button
        className={`search-sidebar-toggle ${isSearchSidebarOpen ? 'is-open' : ''}`}
        type="button"
        aria-controls="search-sidebar"
        aria-expanded={isSearchSidebarOpen}
        aria-label={isSearchSidebarOpen ? 'Hide search sidebar' : 'Show search sidebar'}
        onClick={() => setIsSearchSidebarOpen((isOpen) => !isOpen)}
      >
        {isSearchSidebarOpen ? (
          <svg
            aria-hidden="true"
            className="search-sidebar-toggle-svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            className="search-sidebar-toggle-svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        )}
      </button>

      <div className={`dashboard-layout ${isSearchSidebarOpen ? 'is-search-open' : ''}`}>
        {!dashboardData ? (
          <main className="loading-state">Loading dashboard data...</main>
        ) : (
          <DndContext
            collisionDetection={dashboardCollisionDetection}
            onDragCancel={handleDragCancel}
            onDragEnd={(event) => {
              void handleDragEnd(event)
            }}
            onDragMove={handleDragMove}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
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
                      onEditBookmark={openEditBookmark}
                      onEditGroup={openEditGroup}
                      onOpenGroupBookmarks={openGroupBookmarks}
                      search={search}
                      selectedTags={selectedTags}
                      tagFilterMode={tagFilterMode}
                      suppressBookmarkTransforms={isCrossGroupBookmarkDrag}
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
                      onEditBookmark={openEditBookmark}
                      onEditGroup={openEditGroup}
                      onOpenGroupBookmarks={openGroupBookmarks}
                      search={search}
                      selectedTags={selectedTags}
                      tagFilterMode={tagFilterMode}
                      suppressBookmarkTransforms
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
                      locked={locked}
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

      <aside
        className={`search-sidebar ${isSearchSidebarOpen ? 'is-open' : ''}`}
        id="search-sidebar"
        aria-hidden={!isSearchSidebarOpen}
      >
        <div className="toolbar">
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
            <div className="tag-mode-settings" aria-label="Tag match mode">
              <span>Match tags</span>
              <div className="tag-mode-toggle">
                <button
                  className={`tag-mode-button ${tagFilterMode === 'and' ? 'is-active' : ''}`}
                  onClick={() => setTagFilterMode('and')}
                  type="button"
                >
                  All
                </button>
                <button
                  className={`tag-mode-button ${tagFilterMode === 'or' ? 'is-active' : ''}`}
                  onClick={() => setTagFilterMode('or')}
                  type="button"
                >
                  Any
                </button>
              </div>
            </div>

            <button
              className={`tag-chip ${selectedTags.length === 0 ? 'is-active' : ''}`}
              onClick={() => setSelectedTags([])}
              type="button"
            >
              All tags
            </button>

            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag-chip ${selectedTags.includes(tag) ? 'is-active' : ''}`}
                onClick={() => toggleSelectedTag(tag)}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {undoDeleteToast ? (
        <div className="undo-toast" role="status">
          <span>{undoDeleteToast.message}</span>
          <button type="button" onClick={() => void undoDelete()}>
            Undo
          </button>
        </div>
      ) : null}
    </div>
  )
}
