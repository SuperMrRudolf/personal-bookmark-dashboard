import type { Bookmark, BookmarkGroup, DashboardData, DashboardSettings, QuickSaveDraft } from './types'

const DASHBOARD_DATA_KEY = 'dashboard-data'
const LEGACY_SETTINGS_KEY = 'dashboard-settings'
const QUICK_SAVE_DRAFT_KEY = 'quick-save-draft'
const LEGACY_UNGROUPED_GROUP_ID = 'group-ungrouped'
const DEFAULT_TIMESTAMP = '2026-01-01T00:00:00.000Z'
const DEFAULT_GROUP_COLUMN = 0
const GROUP_COLUMN_COUNT = 4

type CreateGroupInput = {
  name: string
}

type UpdateGroupInput = {
  name?: string
}

type CreateBookmarkInput = {
  name: string
  url: string
  groupId?: string
  groupName?: string
  tags?: string[]
  faviconUrl?: string
}

type UpdateBookmarkInput = Partial<{
  name: string
  url: string
  groupId: string
  groupName: string
  tags: string[]
  faviconUrl: string
}>

type DashboardBackupGroup = Partial<BookmarkGroup> & {
  name?: string
}

type DashboardBackupBookmark = Omit<Partial<Bookmark>, 'tags'> & {
  name?: string
  url?: string
  groupName?: string
  tags?: string[] | string
}

type DashboardBackupPayload = {
  schemaVersion?: number
  settings?: DashboardSettings
  groups?: DashboardBackupGroup[]
  bookmarks?: DashboardBackupBookmark[]
}

export type DashboardBackupFile = {
  backupVersion: 1
  exportedAt: string
  app: 'personal-bookmark-dashboard'
  dashboard: DashboardBackupPayload
}

const defaultSettings: DashboardSettings = {
  locked: true,
}

let fallbackData: DashboardData | null = null
let fallbackQuickSaveDraft: QuickSaveDraft | null = null

function canUseChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getNowTimestamp() {
  return new Date().toISOString()
}

function normalizeTags(tags: string[] | undefined) {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)))
}

function normalizeImportTags(tags: string[] | string | undefined) {
  if (Array.isArray(tags)) {
    return normalizeTags(tags.filter((tag): tag is string => typeof tag === 'string'))
  }

  if (typeof tags === 'string') {
    return normalizeTags(tags.split(','))
  }

  return []
}

function normalizeGroupColumn(column: unknown): BookmarkGroup['column'] {
  return typeof column === 'number' &&
    Number.isInteger(column) &&
    column >= 0 &&
    column < GROUP_COLUMN_COUNT
    ? (column as BookmarkGroup['column'])
    : DEFAULT_GROUP_COLUMN
}

function getNextGroupOrder(groups: BookmarkGroup[], column = DEFAULT_GROUP_COLUMN) {
  return (
    Math.max(
      -1,
      ...groups.filter((group) => group.column === column).map((group) => group.order),
    ) + 1
  )
}

function getNextBookmarkOrder(bookmarks: Bookmark[], groupId: string) {
  return Math.max(-1, ...bookmarks.filter((bookmark) => bookmark.groupId === groupId).map((bookmark) => bookmark.order)) + 1
}

function findGroupByName(groups: BookmarkGroup[], groupName: string) {
  const normalizedGroupName = groupName.trim().toLowerCase()

  return groups.find((group) => group.name.trim().toLowerCase() === normalizedGroupName)
}

function createGroupRecord(
  name: string,
  order: number,
  column: BookmarkGroup['column'] = DEFAULT_GROUP_COLUMN,
): BookmarkGroup {
  const now = getNowTimestamp()

  return {
    id: createId('group'),
    name: name.trim(),
    column,
    order,
    createdAt: now,
    updatedAt: now,
  }
}

function ensureGroupForBookmark(
  groups: BookmarkGroup[],
  input: { groupId?: string; groupName?: string },
) {
  if (input.groupId) {
    const existingGroup = groups.find((group) => group.id === input.groupId)

    if (existingGroup) {
      return {
        groups,
        groupId: existingGroup.id,
      }
    }
  }

  const groupName = input.groupName?.trim()

  if (!groupName) {
    throw new Error('A group is required before saving a bookmark.')
  }

  const existingGroup = findGroupByName(groups, groupName)

  if (existingGroup) {
    return {
      groups,
      groupId: existingGroup.id,
    }
  }

  const group = createGroupRecord(groupName, getNextGroupOrder(groups))

  return {
    groups: [...groups, group],
    groupId: group.id,
  }
}

function createDefaultDashboardData(): DashboardData {
  return {
    schemaVersion: 1,
    settings: defaultSettings,
    groups: [],
    bookmarks: [],
  }
}

function normalizeSettings(value: unknown): DashboardSettings {
  if (!isRecord(value)) {
    return defaultSettings
  }

  return {
    locked: typeof value.locked === 'boolean' ? value.locked : defaultSettings.locked,
  }
}

function normalizeGroup(value: unknown, fallbackOrder: number): BookmarkGroup | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null
  }

  return {
    id: value.id,
    name: value.id === LEGACY_UNGROUPED_GROUP_ID && value.name === 'Ungrouped' ? 'Imported' : value.name,
    column: normalizeGroupColumn(value.column),
    order: typeof value.order === 'number' ? value.order : fallbackOrder,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : DEFAULT_TIMESTAMP,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : DEFAULT_TIMESTAMP,
  }
}

function normalizeGroupOrders(groups: BookmarkGroup[]) {
  return Array.from({ length: GROUP_COLUMN_COUNT }, (_, column) =>
    groups
      .filter((group) => group.column === column)
      .sort((left, right) => left.order - right.order)
      .map((group, index) => ({
        ...group,
        order: index,
      })),
  ).flat()
}

function normalizeBookmark(
  value: unknown,
  fallbackOrder: number,
  validGroupIds: Set<string>,
): Bookmark | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.url !== 'string'
  ) {
    return null
  }

  const requestedGroupId = typeof value.groupId === 'string' ? value.groupId : ''

  if (!validGroupIds.has(requestedGroupId)) {
    return null
  }

  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim())
    : []

  return {
    id: value.id,
    name: value.name,
    url: value.url,
    groupId: requestedGroupId,
    tags: Array.from(new Set(tags.filter(Boolean))),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : DEFAULT_TIMESTAMP,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : DEFAULT_TIMESTAMP,
    order: typeof value.order === 'number' ? value.order : fallbackOrder,
    faviconUrl: typeof value.faviconUrl === 'string' ? value.faviconUrl : undefined,
  }
}

function normalizeDashboardData(value: unknown): DashboardData {
  if (!isRecord(value)) {
    return createDefaultDashboardData()
  }

  const rawGroups = Array.isArray(value.groups) ? value.groups : []
  const rawBookmarks = Array.isArray(value.bookmarks) ? value.bookmarks : []
  const legacyUngroupedHasBookmarks = rawBookmarks.some(
    (bookmark) => isRecord(bookmark) && bookmark.groupId === LEGACY_UNGROUPED_GROUP_ID,
  )
  const groups = normalizeGroupOrders(
    rawGroups
      .filter(
        (group) =>
          !(
            isRecord(group) &&
            group.id === LEGACY_UNGROUPED_GROUP_ID &&
            group.name === 'Ungrouped' &&
            !legacyUngroupedHasBookmarks
          ),
      )
      .map((group, index) => normalizeGroup(group, index))
      .filter((group): group is BookmarkGroup => Boolean(group)),
  )

  const validGroupIds = new Set(groups.map((group) => group.id))
  const bookmarks = rawBookmarks
    .map((bookmark, index) => normalizeBookmark(bookmark, index, validGroupIds))
    .filter((bookmark): bookmark is Bookmark => Boolean(bookmark))

  return {
    schemaVersion: 1,
    settings: normalizeSettings(value.settings),
    groups,
    bookmarks: bookmarks.sort((left, right) => left.order - right.order),
  }
}

function ensureImportedGroup(groups: BookmarkGroup[]) {
  const existingImportedGroup = findGroupByName(groups, 'Imported')

  if (existingImportedGroup) {
    return {
      groups,
      groupId: existingImportedGroup.id,
    }
  }

  const importedGroup = createGroupRecord('Imported', getNextGroupOrder(groups))

  return {
    groups: [...groups, importedGroup],
    groupId: importedGroup.id,
  }
}

function getBackupPayload(value: unknown): DashboardBackupPayload {
  if (isRecord(value) && isRecord(value.dashboard)) {
    return value.dashboard
  }

  if (isRecord(value)) {
    return value
  }

  throw new Error('Backup file is not a valid JSON object.')
}

export function parseDashboardBackup(value: unknown): DashboardData {
  const payload = getBackupPayload(value)
  const rawGroups = Array.isArray(payload.groups) ? payload.groups : []
  const rawBookmarks = Array.isArray(payload.bookmarks) ? payload.bookmarks : []
  let groups = rawGroups
    .map((group, index) => normalizeGroup(group, index))
    .filter((group): group is BookmarkGroup => Boolean(group))

  groups = normalizeGroupOrders(groups)

  const bookmarks = rawBookmarks
    .map((bookmark, index) => {
      if (
        !isRecord(bookmark) ||
        typeof bookmark.name !== 'string' ||
        typeof bookmark.url !== 'string'
      ) {
        return null
      }

      const requestedGroupId = typeof bookmark.groupId === 'string' ? bookmark.groupId : ''
      const requestedGroupName =
        typeof bookmark.groupName === 'string' ? bookmark.groupName.trim() : ''

      let resolvedGroupId = groups.find((group) => group.id === requestedGroupId)?.id ?? ''

      if (!resolvedGroupId && requestedGroupName) {
        const groupResult = ensureGroupForBookmark(groups, { groupName: requestedGroupName })
        groups = groupResult.groups
        resolvedGroupId = groupResult.groupId
      }

      if (!resolvedGroupId) {
        const importedGroupResult = ensureImportedGroup(groups)
        groups = importedGroupResult.groups
        resolvedGroupId = importedGroupResult.groupId
      }

      const normalizedBookmark: Bookmark = {
        id: typeof bookmark.id === 'string' ? bookmark.id : createId('bookmark'),
        name: bookmark.name.trim() || bookmark.url.trim(),
        url: bookmark.url.trim(),
        groupId: resolvedGroupId,
        tags: normalizeImportTags(bookmark.tags),
        createdAt:
          typeof bookmark.createdAt === 'string' ? bookmark.createdAt : DEFAULT_TIMESTAMP,
        updatedAt:
          typeof bookmark.updatedAt === 'string' ? bookmark.updatedAt : DEFAULT_TIMESTAMP,
        order: typeof bookmark.order === 'number' ? bookmark.order : index,
        ...(typeof bookmark.faviconUrl === 'string'
          ? { faviconUrl: bookmark.faviconUrl }
          : {}),
      }

      return normalizedBookmark
    })
    .filter((bookmark): bookmark is Bookmark => bookmark !== null)

  const normalizedGroups = normalizeGroupOrders(groups)
  const bookmarksByGroup = new Map<string, Bookmark[]>()

  bookmarks.forEach((bookmark) => {
    const groupBookmarks = bookmarksByGroup.get(bookmark.groupId) ?? []
    groupBookmarks.push(bookmark)
    bookmarksByGroup.set(bookmark.groupId, groupBookmarks)
  })

  const normalizedBookmarks = Array.from(bookmarksByGroup.values())
    .flatMap((groupBookmarks) =>
      groupBookmarks
        .sort((left, right) => left.order - right.order)
        .map((bookmark, index) => ({
          ...bookmark,
          order: index,
        })),
    )

  return normalizeDashboardData({
    schemaVersion: 1,
    settings: payload.settings,
    groups: normalizedGroups,
    bookmarks: normalizedBookmarks,
  })
}

export async function exportDashboardBackup(): Promise<DashboardBackupFile> {
  const data = await loadDashboardData()
  const groupNamesById = new Map(data.groups.map((group) => [group.id, group.name]))

  return {
    backupVersion: 1,
    exportedAt: getNowTimestamp(),
    app: 'personal-bookmark-dashboard',
    dashboard: {
      schemaVersion: data.schemaVersion,
      settings: data.settings,
      groups: data.groups,
      bookmarks: data.bookmarks.map((bookmark) => ({
        ...bookmark,
        groupName: groupNamesById.get(bookmark.groupId),
      })),
    },
  }
}

export async function loadDashboardData(): Promise<DashboardData> {
  if (!canUseChromeStorage()) {
    fallbackData = normalizeDashboardData(fallbackData)
    return fallbackData
  }

  const stored = await chrome.storage.local.get([DASHBOARD_DATA_KEY, LEGACY_SETTINGS_KEY])
  const data = normalizeDashboardData(stored[DASHBOARD_DATA_KEY])

  if (stored[DASHBOARD_DATA_KEY] === undefined) {
    data.settings = normalizeSettings(stored[LEGACY_SETTINGS_KEY])
  }

  await saveDashboardData(data)
  return data
}

export async function saveDashboardData(data: DashboardData) {
  const normalizedData = normalizeDashboardData(data)

  if (!canUseChromeStorage()) {
    fallbackData = normalizedData
    return
  }

  await chrome.storage.local.set({
    [DASHBOARD_DATA_KEY]: normalizedData,
  })
}

export async function saveQuickSaveDraft(draft: QuickSaveDraft) {
  if (!canUseChromeStorage()) {
    fallbackQuickSaveDraft = draft
    return
  }

  await chrome.storage.local.set({
    [QUICK_SAVE_DRAFT_KEY]: draft,
  })
}

export async function loadQuickSaveDraft(): Promise<QuickSaveDraft | null> {
  if (!canUseChromeStorage()) {
    return fallbackQuickSaveDraft
  }

  const stored = await chrome.storage.local.get(QUICK_SAVE_DRAFT_KEY)
  const draft = stored[QUICK_SAVE_DRAFT_KEY]

  if (
    !isRecord(draft) ||
    typeof draft.name !== 'string' ||
    typeof draft.url !== 'string' ||
    typeof draft.capturedAt !== 'string'
  ) {
    return null
  }

  return {
    name: draft.name,
    url: draft.url,
    capturedAt: draft.capturedAt,
  }
}

export async function clearQuickSaveDraft() {
  if (!canUseChromeStorage()) {
    fallbackQuickSaveDraft = null
    return
  }

  await chrome.storage.local.remove(QUICK_SAVE_DRAFT_KEY)
}

export async function updateDashboardData(updater: (current: DashboardData) => DashboardData) {
  const current = await loadDashboardData()
  const next = updater(current)
  await saveDashboardData(next)
  return next
}

export async function loadSettings(): Promise<DashboardSettings> {
  const data = await loadDashboardData()
  return data.settings
}

export async function saveSettings(settings: DashboardSettings) {
  await updateDashboardData((current) => ({
    ...current,
    settings,
  }))
}

export async function createGroup(input: CreateGroupInput) {
  return updateDashboardData((current) => {
    const groupName = input.name.trim() || 'New Group'
    const existingGroup = findGroupByName(current.groups, groupName)

    if (existingGroup) {
      return current
    }

    const group = createGroupRecord(groupName, getNextGroupOrder(current.groups))

    return {
      ...current,
      groups: [...current.groups, group],
    }
  })
}

export async function updateGroup(groupId: string, updates: UpdateGroupInput) {
  return updateDashboardData((current) => ({
    ...current,
    groups: current.groups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            name: updates.name?.trim() || group.name,
            updatedAt: getNowTimestamp(),
          }
        : group,
    ),
  }))
}

export async function deleteGroup(groupId: string) {
  return updateDashboardData((current) => {
    if (!current.groups.some((group) => group.id === groupId)) {
      throw new Error(`Group "${groupId}" does not exist.`)
    }

    return {
      ...current,
      groups: normalizeGroupOrders(current.groups.filter((group) => group.id !== groupId)),
      bookmarks: current.bookmarks.filter((bookmark) => bookmark.groupId !== groupId),
    }
  })
}

export async function createBookmark(input: CreateBookmarkInput) {
  return updateDashboardData((current) => {
    const now = getNowTimestamp()
    const groupResult = ensureGroupForBookmark(current.groups, input)
    const groupId = groupResult.groupId
    const bookmark: Bookmark = {
      id: createId('bookmark'),
      name: input.name.trim() || input.url.trim(),
      url: input.url.trim(),
      groupId,
      tags: normalizeTags(input.tags),
      createdAt: now,
      updatedAt: now,
      order: getNextBookmarkOrder(current.bookmarks, groupId),
      faviconUrl: input.faviconUrl?.trim() || undefined,
    }

    return {
      ...current,
      groups: groupResult.groups,
      bookmarks: [...current.bookmarks, bookmark],
    }
  })
}

export async function updateBookmark(bookmarkId: string, updates: UpdateBookmarkInput) {
  return updateDashboardData((current) => {
    const now = getNowTimestamp()
    const currentBookmark = current.bookmarks.find((bookmark) => bookmark.id === bookmarkId)
    const groupResult =
      currentBookmark && (updates.groupId !== undefined || updates.groupName !== undefined)
        ? ensureGroupForBookmark(current.groups, {
            groupId: updates.groupId,
            groupName: updates.groupName,
          })
        : { groups: current.groups, groupId: currentBookmark?.groupId ?? '' }

    return {
      ...current,
      groups: groupResult.groups,
      bookmarks: current.bookmarks.map((bookmark) => {
        if (bookmark.id !== bookmarkId) {
          return bookmark
        }

        const nextGroupId = groupResult.groupId
        const groupChanged = nextGroupId !== bookmark.groupId

        return {
          ...bookmark,
          name: updates.name?.trim() || bookmark.name,
          url: updates.url?.trim() || bookmark.url,
          groupId: nextGroupId,
          tags: updates.tags ? normalizeTags(updates.tags) : bookmark.tags,
          faviconUrl:
            updates.faviconUrl === undefined ? bookmark.faviconUrl : updates.faviconUrl.trim() || undefined,
          order: groupChanged ? getNextBookmarkOrder(current.bookmarks, nextGroupId) : bookmark.order,
          updatedAt: now,
        }
      }),
    }
  })
}

export async function deleteBookmark(bookmarkId: string) {
  return updateDashboardData((current) => ({
    ...current,
    bookmarks: current.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
  }))
}
