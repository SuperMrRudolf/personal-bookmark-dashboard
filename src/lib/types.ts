export type Bookmark = {
  id: string
  name: string
  url: string
  tags: string[]
}

export type BookmarkGroup = {
  id: string
  name: string
  bookmarks: Bookmark[]
}

export type DashboardSettings = {
  locked: boolean
}

