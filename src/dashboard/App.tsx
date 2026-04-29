import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/700.css'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useDroppable,
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
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
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

type GroupDropTarget =
  | {
      id: string
      type: 'group'
    }
  | {
      column: BookmarkGroup['column']
      id: string
      type: 'group-column'
    }

const GROUP_COLUMNS: BookmarkGroup['column'][] = [0, 1, 2, 3]

function getGroupColumnLabel(column: BookmarkGroup['column']) {
  return `Column ${column + 1}`
}

function getGroupColumnDropId(column: BookmarkGroup['column']) {
  return `group-column-${column}`
}

function isGroupColumn(value: unknown): value is BookmarkGroup['column'] {
  return typeof value === 'number' && GROUP_COLUMNS.includes(value as BookmarkGroup['column'])
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

    return (
      (containerType === 'group' || containerType === 'group-column') &&
      container.id !== args.active.id
    )
  })
  const filteredArgs = {
    ...args,
    droppableContainers,
  }

  if (activeType === 'group') {
    const groupContainers = droppableContainers.filter(
      (container) => container.data.current?.type === 'group',
    )
    const columnContainers = droppableContainers.filter(
      (container) => container.data.current?.type === 'group-column',
    )
    const columnPointerCollisions = pointerWithin({
      ...args,
      droppableContainers: columnContainers,
    })

    if (columnPointerCollisions.length > 0) {
      const overColumn = columnPointerCollisions[0]?.data?.droppableContainer.data.current?.column
      const columnGroupContainers = groupContainers.filter(
        (container) => container.data.current?.group?.column === overColumn,
      )
      const columnGroupCollisions = closestCenter({
        ...args,
        droppableContainers: columnGroupContainers,
      })

      return columnGroupCollisions.length > 0
        ? columnGroupCollisions
        : columnPointerCollisions
    }

    return closestCenter(filteredArgs)
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

function GroupColumnDropZone({
  children,
  className,
  column,
}: {
  children: ReactNode
  className: string
  column: BookmarkGroup['column']
}) {
  const { setNodeRef } = useDroppable({
    id: getGroupColumnDropId(column),
    data: {
      column,
      type: 'group-column',
    },
  })

  return (
    <section
      className={className}
      data-group-column={column}
      ref={setNodeRef}
    >
      {children}
    </section>
  )
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

type GridBookmarkField = 'name' | 'url' | 'tags'

type GridBookmarkUpdate = {
  name?: string
  url?: string
  tags?: string
}

type GridTagPickerPosition = {
  left: number
  top: number
}

type GridGroupContentProps = {
  group: BookmarkGroup
  groupBookmarks: Bookmark[]
  search: string
  selectedTags: string[]
  tagFilterMode: TagFilterMode
  onCloseTagPicker: () => void
  onDeleteBookmark: (bookmark: Bookmark) => void
  onEditBookmarkField: (bookmark: Bookmark, updates: GridBookmarkUpdate) => void
  onEditGroup: (group: BookmarkGroup) => void
  onOpenGroupBookmarks: (bookmarks: Bookmark[]) => void
  onOpenTagPicker: (bookmarkId: string, inputElement: HTMLInputElement) => void
}

function DragGripIcon() {
  return (
    <svg aria-hidden="true" className="drag-grip-icon" fill="none" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="18" r="1" />
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg aria-hidden="true" className="chevron-icon" fill="none" viewBox="0 0 24 24">
      <path d={expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
    </svg>
  )
}

function GridBookmarkCellInput({
  bookmark,
  field,
  onActivate,
  placeholder,
  type = 'text',
  value,
  onCommit,
  onEscape,
}: {
  bookmark: Bookmark
  field: GridBookmarkField
  onActivate?: (inputElement: HTMLInputElement) => void
  placeholder: string
  type?: string
  value: string
  onCommit: (bookmark: Bookmark, updates: GridBookmarkUpdate) => void
  onEscape?: () => void
}) {
  const [draftValue, setDraftValue] = useState(value)

  useEffect(() => {
    setDraftValue(value)
  }, [value])

  function commitValue(nextValue: string) {
    if (nextValue === value) {
      return
    }

    onCommit(bookmark, { [field]: nextValue })
  }

  return (
    <input
      className="grid-edit-input"
      type={type}
      value={draftValue}
      placeholder={placeholder}
      onBlur={() => commitValue(draftValue)}
      onChange={(event) => setDraftValue(event.target.value)}
      onClick={(event) => onActivate?.(event.currentTarget)}
      onFocus={(event) => onActivate?.(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
          return
        }

        if (event.key === 'Escape') {
          setDraftValue(value)
          onEscape?.()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function SortableGridBookmarkRow({
  bookmark,
  search,
  selectedTags,
  tagFilterMode,
  onCloseTagPicker,
  onDeleteBookmark,
  onEditBookmarkField,
  onOpenTagPicker,
}: {
  bookmark: Bookmark
  search: string
  selectedTags: string[]
  tagFilterMode: TagFilterMode
  onCloseTagPicker: () => void
  onDeleteBookmark: (bookmark: Bookmark) => void
  onEditBookmarkField: (bookmark: Bookmark, updates: GridBookmarkUpdate) => void
  onOpenTagPicker: (bookmarkId: string, inputElement: HTMLInputElement) => void
}) {
  const visible = matchesBookmark(search, selectedTags, tagFilterMode, bookmark)
  const { src, fallbackSrc } = getBookmarkIconSources(bookmark.url)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id,
    disabled: !visible,
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
      className={`grid-edit-row ${visible ? '' : 'is-hidden'} ${visible ? 'is-sortable' : ''} ${isDragging ? 'is-dragging' : ''}`}
      data-bookmark-id={bookmark.id}
      ref={setNodeRef}
      style={style}
    >
      <button
        className="grid-drag-handle"
        type="button"
        aria-label={`Drag ${bookmark.name}`}
        {...attributes}
        tabIndex={visible ? 0 : -1}
        {...listeners}
      >
        <DragGripIcon />
      </button>

      <div className="grid-name-cell">
        <img
          className="grid-bookmark-favicon"
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

        <GridBookmarkCellInput
          bookmark={bookmark}
          field="name"
          placeholder="Bookmark name"
          value={bookmark.name}
          onCommit={onEditBookmarkField}
        />
      </div>

      <GridBookmarkCellInput
        bookmark={bookmark}
        field="url"
        placeholder="https://example.com"
        type="url"
        value={bookmark.url}
        onCommit={onEditBookmarkField}
      />

      <div className="grid-tag-cell">
        <GridBookmarkCellInput
          bookmark={bookmark}
          field="tags"
          onActivate={(inputElement) => onOpenTagPicker(bookmark.id, inputElement)}
          onEscape={onCloseTagPicker}
          placeholder=""
          value={formatTags(bookmark.tags)}
          onCommit={onEditBookmarkField}
        />
      </div>

      <button
        className="grid-delete-button"
        type="button"
        aria-label={`Delete ${bookmark.name}`}
        tabIndex={visible ? 0 : -1}
        onClick={() => {
          onCloseTagPicker()
          onDeleteBookmark(bookmark)
        }}
      >
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M9 4h6" />
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6 7l1 14h10l1-14" />
        </svg>
      </button>
    </div>
  )
}

function GridGroupContent({
  group,
  groupBookmarks,
  search,
  selectedTags,
  tagFilterMode,
  onCloseTagPicker,
  onDeleteBookmark,
  onEditBookmarkField,
  onEditGroup,
  onOpenGroupBookmarks,
  onOpenTagPicker,
}: GridGroupContentProps) {
  return (
    <>
      <div className="group-header grid-edit-group-header">
        <div className="group-title">
          <h2>{group.name}</h2>
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
          <button className="group-edit-button" type="button" onClick={() => onEditGroup(group)}>
            Edit group
          </button>
        </div>
      </div>

      <SortableContext
        items={groupBookmarks.map((bookmark) => bookmark.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid-edit-table">
          <div className="grid-edit-row grid-edit-head" aria-hidden="true">
            <span />
            <span>Name</span>
            <span>URL</span>
            <span>Tags</span>
            <span />
          </div>

          {groupBookmarks.map((bookmark) => (
            <SortableGridBookmarkRow
              bookmark={bookmark}
              key={bookmark.id}
              onCloseTagPicker={onCloseTagPicker}
              onDeleteBookmark={onDeleteBookmark}
              onEditBookmarkField={onEditBookmarkField}
              onOpenTagPicker={onOpenTagPicker}
              search={search}
              selectedTags={selectedTags}
              tagFilterMode={tagFilterMode}
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

type SortableGridGroupSectionProps = GridGroupContentProps & {
  groupSortingDisabled: boolean
}

function SortableGridGroupSection(props: SortableGridGroupSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.group.id,
    disabled: props.groupSortingDisabled,
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
      className={`group-card grid-edit-group ${props.groupSortingDisabled ? '' : 'is-sortable'} ${isDragging ? 'is-dragging' : ''}`}
      data-group-id={props.group.id}
      ref={setNodeRef}
      style={style}
    >
      <button
        className="grid-group-drag-handle"
        type="button"
        aria-label={`Drag ${props.group.name}`}
        {...attributes}
        {...listeners}
      >
        <DragGripIcon />
      </button>
      <GridGroupContent {...props} />
    </section>
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
  const [isGridEditMode, setIsGridEditMode] = useState(false)
  const [collapsedGridColumns, setCollapsedGridColumns] = useState<BookmarkGroup['column'][]>([])
  const [activeTagPickerBookmarkId, setActiveTagPickerBookmarkId] = useState<string | null>(null)
  const [tagPickerPosition, setTagPickerPosition] = useState<GridTagPickerPosition | null>(null)
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
  const groupDragProjectionRef = useRef<DashboardData | null>(null)
  const groupDropTargetRef = useRef<GroupDropTarget | null>(null)
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
    if (!dashboardData?.settings.locked) {
      return
    }

    setIsGridEditMode(false)
    setActiveTagPickerBookmarkId(null)
    setTagPickerPosition(null)
  }, [dashboardData?.settings.locked])

  useEffect(() => {
    if (!activeTagPickerBookmarkId) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target

      if (
        target instanceof Element &&
        (target.closest('.grid-tag-cell') || target.closest('.grid-tag-picker'))
      ) {
        return
      }

      closeGridTagPicker()
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [activeTagPickerBookmarkId])

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

  function toggleGridColumn(column: BookmarkGroup['column']) {
    setCollapsedGridColumns((currentColumns) =>
      currentColumns.includes(column)
        ? currentColumns.filter((currentColumn) => currentColumn !== column)
        : [...currentColumns, column],
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

  function closeGridTagPicker() {
    setActiveTagPickerBookmarkId(null)
    setTagPickerPosition(null)
  }

  function openGridTagPicker(bookmarkId: string, inputElement: HTMLInputElement) {
    const rect = inputElement.getBoundingClientRect()
    const pickerWidth = Math.min(380, Math.max(240, window.innerWidth - 32))
    const left = Math.min(
      Math.max(16, rect.left + 40),
      Math.max(16, window.innerWidth - pickerWidth - 16),
    )
    const top = Math.min(rect.bottom, Math.max(16, window.innerHeight - 280))

    setActiveTagPickerBookmarkId(bookmarkId)
    setTagPickerPosition({ left, top })
  }

  async function handleGridBookmarkFieldUpdate(bookmark: Bookmark, updates: GridBookmarkUpdate) {
    const trimmedUrl = updates.url?.trim()

    if (updates.url !== undefined && !trimmedUrl) {
      setStatusMessage('Bookmark URL is required.')
      return
    }

    try {
      const nextData = await updateBookmark(bookmark.id, {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.url !== undefined ? { url: updates.url } : {}),
        ...(updates.tags !== undefined ? { tags: updates.tags.split(',') } : {}),
      })

      latestDashboardDataRef.current = nextData
      setDashboardData(nextData)
      setStatusMessage(null)
    } catch {
      setStatusMessage('Bookmark update failed.')
    }
  }

  async function handleGridBookmarkDelete(bookmark: Bookmark) {
    const restoreData = dashboardData

    try {
      const nextData = await deleteBookmark(bookmark.id)

      latestDashboardDataRef.current = nextData
      setDashboardData(nextData)
      if (activeTagPickerBookmarkId === bookmark.id) {
        closeGridTagPicker()
      }

      if (restoreData) {
        showUndoDeleteToast(`Deleted ${bookmark.name}.`, restoreData)
      }
    } catch {
      setStatusMessage('Bookmark delete failed.')
    }
  }

  async function handleGridTagToggle(tag: string) {
    if (!activeTagPickerBookmarkId) {
      return
    }

    const activeBookmark = bookmarks.find((bookmark) => bookmark.id === activeTagPickerBookmarkId)

    if (!activeBookmark) {
      closeGridTagPicker()
      return
    }

    const nextTags = activeBookmark.tags.includes(tag)
      ? activeBookmark.tags.filter((currentTag) => currentTag !== tag)
      : [...activeBookmark.tags, tag]

    try {
      const nextData = await updateBookmark(activeBookmark.id, { tags: nextTags })

      latestDashboardDataRef.current = nextData
      setDashboardData(nextData)
    } catch {
      setStatusMessage('Tag update failed.')
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
      groupDragProjectionRef.current = null
      groupDropTargetRef.current = null
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

    if (dragType === 'group') {
      rememberGroupDropTarget(event)
      return
    }

    if (dragType === 'bookmark') {
      previewBookmarkReorder(event)
    }
  }

  function normalizeGroupOrders(groupsToNormalize: BookmarkGroup[]) {
    return GROUP_COLUMNS.flatMap((column) =>
      groupsToNormalize
        .filter((group) => group.column === column)
        .sort((left, right) => left.order - right.order)
        .map((group, index) => ({
          ...group,
          order: index,
        })),
    )
  }

  function moveGroupToColumnTarget(
    current: DashboardData,
    activeGroupId: string,
    targetColumn: BookmarkGroup['column'],
    overGroupId: string | null,
  ) {
    const activeGroup = current.groups.find((group) => group.id === activeGroupId)

    if (!activeGroup) {
      return null
    }

    const targetColumnGroups = current.groups
      .filter((group) => group.column === targetColumn)
      .sort((left, right) => left.order - right.order)
    const targetColumnGroupsWithoutActive = targetColumnGroups.filter(
      (group) => group.id !== activeGroupId,
    )
    const targetIndexWithActive = overGroupId
      ? targetColumnGroups.findIndex((group) => group.id === overGroupId)
      : targetColumnGroups.length
    const safeTargetIndex = Math.max(
      0,
      Math.min(
        targetIndexWithActive === -1
          ? targetColumnGroupsWithoutActive.length
          : targetIndexWithActive,
        targetColumnGroupsWithoutActive.length,
      ),
    )

    if (
      activeGroup.column === targetColumn &&
      targetColumnGroups.findIndex((group) => group.id === activeGroupId) === safeTargetIndex
    ) {
      return null
    }

    targetColumnGroupsWithoutActive.splice(safeTargetIndex, 0, {
      ...activeGroup,
      column: targetColumn,
    })

    const nextGroups =
      activeGroup.column === targetColumn
        ? [
            ...current.groups.filter((group) => group.column !== targetColumn),
            ...targetColumnGroupsWithoutActive,
          ]
        : [
            ...current.groups.filter(
              (group) => group.column !== activeGroup.column && group.column !== targetColumn,
            ),
            ...current.groups.filter(
              (group) => group.column === activeGroup.column && group.id !== activeGroupId,
            ),
            ...targetColumnGroupsWithoutActive,
          ]

    return {
      ...current,
      groups: normalizeGroupOrders(nextGroups),
    }
  }

  function getGroupDropTarget(event: DragOverEvent | DragMoveEvent | DragEndEvent) {
    const over = event.over
    const overType = over?.data.current?.type

    if (!over || over.id === event.active.id) {
      return null
    }

    if (overType === 'group') {
      return {
        id: String(over.id),
        type: 'group',
      } satisfies GroupDropTarget
    }

    if (overType === 'group-column') {
      const overColumn = over.data.current?.column

      if (!isGroupColumn(overColumn)) {
        return null
      }

      return {
        column: overColumn,
        id: String(over.id),
        type: 'group-column',
      } satisfies GroupDropTarget
    }

    return null
  }

  function rememberGroupDropTarget(event: DragOverEvent | DragMoveEvent | DragEndEvent) {
    const target = getGroupDropTarget(event)

    if (target) {
      groupDropTargetRef.current = target
    }
  }

  function previewGroupReorder(event: DragOverEvent) {
    const activeGroupId = String(event.active.id)
    const target = getGroupDropTarget(event)

    if (!target) {
      return
    }

    groupDropTargetRef.current = target

    setDashboardData((current) => {
      if (!current) {
        return current
      }

      const activeGroup = current.groups.find((group) => group.id === activeGroupId)
      const overGroup =
        target.type === 'group'
          ? current.groups.find((group) => group.id === target.id)
          : null
      const targetColumn = overGroup?.column ?? (target.type === 'group-column' ? target.column : null)

      if (!activeGroup || targetColumn === null || activeGroup.column === targetColumn) {
        return current
      }

      const nextData = moveGroupToColumnTarget(
        current,
        activeGroupId,
        targetColumn,
        overGroup?.id ?? null,
      )

      if (!nextData) {
        return current
      }

      groupDragProjectionRef.current = nextData
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
      targetGroupElement.querySelectorAll<HTMLElement>(
        '.bookmark-row[data-bookmark-id]:not(.is-hidden), .grid-edit-row[data-bookmark-id]:not(.is-hidden)',
      ),
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
    groupDragProjectionRef.current = null
    groupDropTargetRef.current = null

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
      groupDragProjectionRef.current = null
      groupDropTargetRef.current = null
      dragStartDataRef.current = null
      return
    }

    if (dragType !== 'group') {
      groupDragProjectionRef.current = null
      groupDropTargetRef.current = null
      dragStartDataRef.current = null
      return
    }

    const activeGroupId = String(event.active.id)
    const currentData = latestDashboardDataRef.current
    const activeGroup = currentData?.groups.find((group) => group.id === activeGroupId)
    const originalGroup = dragStartDataRef.current?.groups.find((group) => group.id === activeGroupId)
    const hasPreviewMovedAcrossColumns =
      Boolean(activeGroup) &&
      Boolean(originalGroup) &&
      activeGroup?.column !== originalGroup?.column
    const dropTarget = groupDropTargetRef.current ?? getGroupDropTarget(event)

    if (!dropTarget) {
      if (hasPreviewMovedAcrossColumns && currentData) {
        latestDashboardDataRef.current = currentData
        setDashboardData(currentData)
        await saveDashboardData(currentData)
      } else if (dragStartDataRef.current) {
        latestDashboardDataRef.current = dragStartDataRef.current
        setDashboardData(dragStartDataRef.current)
      }

      groupDragProjectionRef.current = null
      groupDropTargetRef.current = null
      dragStartDataRef.current = null
      return
    }

    if (!currentData || !activeGroup) {
      groupDragProjectionRef.current = null
      groupDropTargetRef.current = null
      dragStartDataRef.current = null
      return
    }

    if (dropTarget.type === 'group') {
      const overGroupId = dropTarget.id
      const overGroup = currentData.groups.find((group) => group.id === overGroupId)

      if (overGroup) {
        if (activeGroup.column === overGroup.column) {
          const columnGroups = currentData.groups
            .filter((group) => group.column === activeGroup.column)
            .sort((left, right) => left.order - right.order)
          const oldIndex = columnGroups.findIndex((group) => group.id === activeGroupId)
          const newIndex = columnGroups.findIndex((group) => group.id === overGroupId)

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const reorderedColumnGroups = arrayMove(columnGroups, oldIndex, newIndex)
            const nextData = {
              ...currentData,
              groups: normalizeGroupOrders([
                ...currentData.groups.filter((group) => group.column !== activeGroup.column),
                ...reorderedColumnGroups,
              ]),
            }

            latestDashboardDataRef.current = nextData
            setDashboardData(nextData)
            await saveDashboardData(nextData)
            groupDragProjectionRef.current = null
            groupDropTargetRef.current = null
            dragStartDataRef.current = null
            return
          }
        } else {
          const nextData = moveGroupToColumnTarget(
            currentData,
            activeGroupId,
            overGroup.column,
            overGroup.id,
          )

          if (nextData) {
            latestDashboardDataRef.current = nextData
            setDashboardData(nextData)
            await saveDashboardData(nextData)
            groupDragProjectionRef.current = null
            groupDropTargetRef.current = null
            dragStartDataRef.current = null
            return
          }
        }
      }
    }

    if (dropTarget.type === 'group-column') {
      if (activeGroup.column !== dropTarget.column) {
        const nextData = moveGroupToColumnTarget(currentData, activeGroupId, dropTarget.column, null)

        if (nextData) {
          latestDashboardDataRef.current = nextData
          setDashboardData(nextData)
          await saveDashboardData(nextData)
          groupDragProjectionRef.current = null
          groupDropTargetRef.current = null
          dragStartDataRef.current = null
          return
        }
      }
    }

    await saveDashboardData(currentData)
    groupDragProjectionRef.current = null
    groupDropTargetRef.current = null
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
  const isFilteringBookmarks = search.trim().length > 0 || selectedTags.length > 0
  const visibleGroupIds = isFilteringBookmarks
    ? bookmarks.reduce((groupIds, bookmark) => {
        if (matchesBookmark(search, selectedTags, tagFilterMode, bookmark)) {
          groupIds.add(bookmark.groupId)
        }

        return groupIds
      }, new Set<string>())
    : null
  const visibleGroups = visibleGroupIds
    ? groups.filter((group) => visibleGroupIds.has(group.id))
    : groups
  const visibleGroupsByColumn = GROUP_COLUMNS.map((column) => ({
    column,
    groups: visibleGroups
      .filter((group) => group.column === column)
      .sort((left, right) => left.order - right.order),
  }))
  const allTags = Array.from(tagCounts.keys()).sort(
    (left, right) => (tagCounts.get(right) ?? 0) - (tagCounts.get(left) ?? 0) || left.localeCompare(right),
  )
  const activeTagPickerBookmark = activeTagPickerBookmarkId
    ? bookmarks.find((bookmark) => bookmark.id === activeTagPickerBookmarkId)
    : null

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
          {!locked && dashboardData ? (
            <button
              className={`grid-edit-toggle ${isGridEditMode ? 'is-active' : ''}`}
              type="button"
              onClick={() => {
                setIsGridEditMode((isEnabled) => !isEnabled)
                closeGridTagPicker()
              }}
            >
              {isGridEditMode ? 'Exit Grid View' : 'Edit in Grid View'}
            </button>
          ) : null}
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
            <main
              className={isGridEditMode ? 'grid-edit-board' : 'group-grid'}
            >
              {visibleGroupsByColumn.map(({ column, groups: columnGroups }) => {
                const columnLabel = getGroupColumnLabel(column)

                if (isGridEditMode) {
                  if (isFilteringBookmarks && columnGroups.length === 0) {
                    return null
                  }

                  const isCollapsed = collapsedGridColumns.includes(column)

                  return (
                    <GroupColumnDropZone
                      className={`grid-edit-column-section ${isCollapsed ? 'is-collapsed' : ''}`}
                      column={column}
                      key={column}
                    >
                      <button
                        className="grid-edit-column-toggle"
                        type="button"
                        aria-expanded={!isCollapsed}
                        onClick={() => toggleGridColumn(column)}
                      >
                        <span className="grid-edit-column-title">{columnLabel}</span>
                        <span className="grid-edit-column-meta">
                          <span>{columnGroups.length}</span>
                          <ChevronIcon expanded={!isCollapsed} />
                        </span>
                      </button>

                      {!isCollapsed ? (
                        <SortableContext
                          items={columnGroups.map((group) => group.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="grid-edit-column-groups">
                            {columnGroups.map((group) => {
                              const groupBookmarks = bookmarks
                                .filter((bookmark) => bookmark.groupId === group.id)
                                .sort((left, right) => left.order - right.order)

                              return (
                                <SortableGridGroupSection
                                  group={group}
                                  groupBookmarks={groupBookmarks}
                                  groupSortingDisabled={Boolean(draggingBookmarkId)}
                                  key={group.id}
                                  onCloseTagPicker={closeGridTagPicker}
                                  onDeleteBookmark={(bookmark) => {
                                    void handleGridBookmarkDelete(bookmark)
                                  }}
                                  onEditBookmarkField={(bookmark, updates) => {
                                    void handleGridBookmarkFieldUpdate(bookmark, updates)
                                  }}
                                  onEditGroup={openEditGroup}
                                  onOpenGroupBookmarks={openGroupBookmarks}
                                  onOpenTagPicker={openGridTagPicker}
                                  search={search}
                                  selectedTags={selectedTags}
                                  tagFilterMode={tagFilterMode}
                                />
                              )
                            })}
                          </div>
                        </SortableContext>
                      ) : null}
                    </GroupColumnDropZone>
                  )
                }

                return (
                  <GroupColumnDropZone className="group-column" column={column} key={column}>
                    <SortableContext
                      items={columnGroups.map((group) => group.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="group-column-stack">
                        {columnGroups.map((group) => {
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
                      </div>
                    </SortableContext>
                  </GroupColumnDropZone>
                )
              })}
            </main>

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

      {activeTagPickerBookmark && tagPickerPosition && allTags.length > 0
        ? createPortal(
            <div
              className="grid-tag-picker"
              role="dialog"
              aria-label="Existing tags"
              style={{
                left: tagPickerPosition.left,
                top: tagPickerPosition.top,
              }}
              onMouseDown={(event) => event.preventDefault()}
            >
              <div className="grid-tag-picker-list">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={`tag-chip tag-picker-chip ${
                      activeTagPickerBookmark.tags.includes(tag) ? 'is-active' : ''
                    }`}
                    type="button"
                    onClick={() => {
                      void handleGridTagToggle(tag)
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}

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
