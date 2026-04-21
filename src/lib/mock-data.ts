import type { BookmarkGroup } from './types'

export const mockGroups: BookmarkGroup[] = [
  {
    id: 'group-ungrouped',
    name: 'Ungrouped',
    bookmarks: [
      {
        id: 'bookmark-github',
        name: 'GitHub',
        url: 'https://github.com',
        tags: ['dev', 'tools'],
      },
      {
        id: 'bookmark-openai',
        name: 'OpenAI',
        url: 'https://openai.com',
        tags: ['ai', 'reference'],
      },
    ],
  },
  {
    id: 'group-build',
    name: 'Build',
    bookmarks: [
      {
        id: 'bookmark-vite',
        name: 'Vite',
        url: 'https://vite.dev',
        tags: ['docs', 'frontend'],
      },
      {
        id: 'bookmark-crxjs',
        name: 'CRXJS',
        url: 'https://crxjs.dev',
        tags: ['docs', 'extension'],
      },
      {
        id: 'bookmark-react',
        name: 'React',
        url: 'https://react.dev',
        tags: ['frontend', 'reference'],
      },
    ],
  },
  {
    id: 'group-design',
    name: 'Inspiration',
    bookmarks: [
      {
        id: 'bookmark-dribbble',
        name: 'Dribbble',
        url: 'https://dribbble.com',
        tags: ['design', 'inspiration'],
      },
      {
        id: 'bookmark-pinterest',
        name: 'Pinterest',
        url: 'https://www.pinterest.com',
        tags: ['design', 'visual'],
      },
    ],
  },
]

