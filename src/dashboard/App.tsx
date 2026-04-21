import { useEffect, useState } from 'react'
import { mockGroups } from '../lib/mock-data'
import { loadSettings, saveSettings } from '../lib/storage'

function matchesBookmark(
  query: string,
  selectedTag: string | null,
  bookmark: { name: string; url: string; tags: string[] },
) {
  const normalizedQuery = query.trim().toLowerCase()
  const queryMatch =
    normalizedQuery.length === 0 ||
    bookmark.name.toLowerCase().includes(normalizedQuery) ||
    bookmark.url.toLowerCase().includes(normalizedQuery)
  const tagMatch = !selectedTag || bookmark.tags.includes(selectedTag)

  return queryMatch && tagMatch
}

export function App() {
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [locked, setLocked] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    async function hydrateSettings() {
      const settings = await loadSettings()
      setLocked(settings.locked)
      setIsHydrated(true)
    }

    void hydrateSettings()
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    void saveSettings({ locked })
  }, [isHydrated, locked])

  const allTags = Array.from(
    new Set(mockGroups.flatMap((group) => group.bookmarks.flatMap((bookmark) => bookmark.tags))),
  ).sort((left, right) => left.localeCompare(right))

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
            onClick={() => setLocked((current) => !current)}
            type="button"
          >
            {locked ? 'Locked layout' : 'Unlocked layout'}
          </button>

          <button className="secondary-button" type="button" disabled>
            Export JSON
          </button>
        </div>
      </header>

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

      <main className="group-grid">
        {mockGroups.map((group) => (
          <section className="group-card" key={group.id}>
            <div className="group-header">
              <div>
                <p className="group-label">Group</p>
                <h2>{group.name}</h2>
              </div>
              <button className="ghost-button" type="button" disabled={locked}>
                Add bookmark
              </button>
            </div>

            <div className="bookmark-list">
              {group.bookmarks.map((bookmark) => {
                const visible = matchesBookmark(search, selectedTag, bookmark)
                const hostname = new URL(bookmark.url).hostname

                return (
                  <a
                    className={`bookmark-row ${visible ? '' : 'is-hidden'}`}
                    href={bookmark.url}
                    key={bookmark.id}
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
                )
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

