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
  order: number
  createdAt: string
  updatedAt: string
}

export type DashboardSettings = {
  locked: boolean
}

export type DashboardData = {
  schemaVersion: 1
  settings: DashboardSettings
  groups: BookmarkGroup[]
  bookmarks: Bookmark[]
}

export type QuickSaveDraft = {
  name: string
  url: string
  capturedAt: string
}
