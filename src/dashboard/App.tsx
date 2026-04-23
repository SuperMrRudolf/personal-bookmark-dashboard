import { useEffect, useState, type FormEvent } from 'react'
import {
  createBookmark,
  createGroup,
  deleteBookmark,
  deleteGroup,
  loadDashboardData,
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

  useEffect(() => {
    async function hydrateDashboardData() {
      const data = await loadDashboardData()
      setDashboardData(data)
    }

    void hydrateDashboardData()
  }, [])

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

  function closeForms() {
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

  const locked = dashboardData?.settings.locked ?? true
  const groups = dashboardData?.groups ?? []
  const bookmarks = dashboardData?.bookmarks ?? []

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

          <button className="secondary-button" type="button" disabled>
            Export JSON
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
      </header>

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
              <p className="form-eyebrow">{editingBookmarkId ? 'Edit Bookmark' : 'New Bookmark'}</p>
              <h2>{editingBookmarkId ? 'Update bookmark' : 'Add a bookmark'}</h2>
            </div>

            <label>
              <span>Group</span>
              <input
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
                autoFocus
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
        <main className="group-grid">
          {groups.map((group) => {
            const groupBookmarks = bookmarks
              .filter((bookmark) => bookmark.groupId === group.id)
              .sort((left, right) => left.order - right.order)

            return (
              <section className="group-card" key={group.id}>
                <div className="group-header">
                  <div>
                    <p className="group-label">Group</p>
                    <div className="group-title">
                      <h2>{group.name}</h2>
                      {groupBookmarks.length > 0 ? (
                        <button
                          className="open-all-button"
                          type="button"
                          onClick={() => openGroupBookmarks(groupBookmarks)}
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
                      onClick={() => openAddBookmark(group.name)}
                    >
                      Add bookmark
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => openEditGroup(group)}
                    >
                      Edit group
                    </button>
                  </div>
                </div>

                <div className="bookmark-list">
                  {groupBookmarks.map((bookmark) => {
                    const visible = matchesBookmark(search, selectedTag, bookmark)
                    const hostname = getDisplayHostname(bookmark.url)

                    return (
                      <div className={`bookmark-row ${visible ? '' : 'is-hidden'}`} key={bookmark.id}>
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
                          onClick={() => openEditBookmark(bookmark)}
                        >
                          Edit
                        </button>
                      </div>
                    )
                  })}

                  {groupBookmarks.length === 0 ? (
                    <p className="group-empty">
                      No bookmarks yet. This group is ready for Phase 4 CRUD.
                    </p>
                  ) : null}
                </div>
              </section>
            )
          })}
        </main>
      )}
    </div>
  )
}
