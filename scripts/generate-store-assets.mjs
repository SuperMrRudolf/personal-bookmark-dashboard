import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { deflateSync } from 'node:zlib'

const outputDir = 'store-listing/assets'
const force = process.argv.includes('--force')
const generatedFiles = [
  'icon-128.png',
  'screenshot-01-dashboard.png',
  'screenshot-02-search-tags.png',
  'screenshot-03-quick-save.png',
  'screenshot-04-organize.png',
  'screenshot-05-backup.png',
  'small-promo-tile.png',
  'marquee-promo.png',
]

mkdirSync(outputDir, { recursive: true })

const existingFiles = generatedFiles.filter((file) => existsSync(join(outputDir, file)))

if (existingFiles.length > 0 && !force) {
  console.error(
    [
      `Refusing to overwrite existing store assets in ${outputDir}.`,
      'Run `node scripts/generate-store-assets.mjs --force` only if you want placeholder assets regenerated.',
    ].join('\n'),
  )
  process.exit(1)
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let c = index
  for (let bit = 0; bit < 8; bit += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  const crc = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function writePng(path, image) {
  const raw = Buffer.alloc((image.width * 4 + 1) * image.height)
  for (let y = 0; y < image.height; y += 1) {
    const sourceStart = y * image.width * 4
    const targetStart = y * (image.width * 4 + 1)
    raw[targetStart] = 0
    image.pixels.copy(raw, targetStart + 1, sourceStart, sourceStart + image.width * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(image.width, 0)
  ihdr.writeUInt32BE(image.height, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

function hex(color) {
  const normalized = color.replace('#', '')
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
    normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) : 255,
  ]
}

function createImage(width, height, background) {
  const [r, g, b, a] = hex(background)
  const pixels = Buffer.alloc(width * height * 4)
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = r
    pixels[offset + 1] = g
    pixels[offset + 2] = b
    pixels[offset + 3] = a
  }
  return { width, height, pixels }
}

function putPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return
  }
  const [r, g, b, a] = hex(color)
  const offset = (Math.floor(y) * image.width + Math.floor(x)) * 4
  const alpha = a / 255
  image.pixels[offset] = Math.round(r * alpha + image.pixels[offset] * (1 - alpha))
  image.pixels[offset + 1] = Math.round(g * alpha + image.pixels[offset + 1] * (1 - alpha))
  image.pixels[offset + 2] = Math.round(b * alpha + image.pixels[offset + 2] * (1 - alpha))
  image.pixels[offset + 3] = 255
}

function rect(image, x, y, width, height, color) {
  for (let row = Math.max(0, y); row < Math.min(image.height, y + height); row += 1) {
    for (let col = Math.max(0, x); col < Math.min(image.width, x + width); col += 1) {
      putPixel(image, col, row, color)
    }
  }
}

function roundedRect(image, x, y, width, height, radius, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      const left = col < x + radius
      const right = col >= x + width - radius
      const top = row < y + radius
      const bottom = row >= y + height - radius
      const cornerX = left ? x + radius : right ? x + width - radius - 1 : col
      const cornerY = top ? y + radius : bottom ? y + height - radius - 1 : row
      if ((col - cornerX) ** 2 + (row - cornerY) ** 2 <= radius ** 2) {
        putPixel(image, col, row, color)
      }
    }
  }
}

function line(image, x1, y1, x2, y2, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
  for (let step = 0; step <= steps; step += 1) {
    const t = steps === 0 ? 0 : step / steps
    putPixel(image, Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), color)
  }
}

const glyphs = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '01100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '-': ['00000', '00000', '00000', '11110', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00100', '01000', '10000', '00000', '00000'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '11100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
}

function text(image, value, x, y, scale, color) {
  let cursor = x
  for (const character of value.toUpperCase()) {
    const glyph = glyphs[character] ?? glyphs[' ']
    glyph.forEach((row, rowIndex) => {
      for (let col = 0; col < row.length; col += 1) {
        if (row[col] === '1') {
          rect(image, cursor + col * scale, y + rowIndex * scale, scale, scale, color)
        }
      }
    })
    cursor += 6 * scale
  }
}

function softBackground(image) {
  for (let y = 0; y < image.height; y += 1) {
    const t = y / image.height
    const r = Math.round(10 + 10 * t)
    const g = Math.round(18 + 16 * t)
    const b = Math.round(31 + 19 * t)
    rect(image, 0, y, image.width, 1, `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`)
  }
  for (let x = 0; x < image.width; x += 32) {
    line(image, x, 0, x, image.height, '#ffffff08')
  }
  for (let y = 0; y < image.height; y += 32) {
    line(image, 0, y, image.width, y, '#ffffff08')
  }
}

function drawToolbar(image, title, subtitle) {
  roundedRect(image, 48, 36, image.width - 96, 88, 18, '#172033')
  roundedRect(image, 72, 60, 40, 40, 10, '#25d6a2')
  text(image, 'P', 84, 69, 4, '#08131f')
  text(image, title, 136, 54, 4, '#f8fafc')
  text(image, subtitle, 138, 91, 2, '#9fb1c7')
  roundedRect(image, image.width - 250, 62, 74, 34, 10, '#243047')
  text(image, 'LOCK', image.width - 235, 73, 2, '#dce7f5')
  roundedRect(image, image.width - 160, 62, 88, 34, 10, '#25d6a2')
  text(image, '+ SAVE', image.width - 146, 73, 2, '#08131f')
}

function drawDashboard(image, title, subtitle, variant = 0) {
  softBackground(image)
  drawToolbar(image, title, subtitle)
  roundedRect(image, 48, 148, 258, 600, 18, '#131d2f')
  text(image, 'SEARCH', 76, 180, 3, '#f8fafc')
  roundedRect(image, 76, 224, 198, 38, 10, '#0b1220')
  text(image, 'DESIGN AI DOCS', 96, 237, 2, '#7f93ae')
  text(image, 'TAGS', 76, 300, 3, '#f8fafc')
  const tags = ['AI', 'DESIGN', 'DOCS', 'WORK', 'READ']
  tags.forEach((tag, index) => {
    const y = 344 + index * 52
    roundedRect(image, 76, y, 160 + (index % 2) * 38, 34, 10, index === variant ? '#25d6a2' : '#243047')
    text(image, tag, 94, y + 11, 2, index === variant ? '#08131f' : '#dce7f5')
  })
  text(image, '42 BOOKMARKS', 76, 654, 2, '#7f93ae')

  const columns = [
    ['AI TOOLS', ['CHATGPT', 'CLAUDE', 'PERPLEXITY', 'HUGGING FACE']],
    ['WORK', ['GMAIL', 'CALENDAR', 'DRIVE', 'SLACK']],
    ['LEARN', ['YOUTUBE', 'REDDIT', 'GITHUB', 'DOCUMENTS']],
  ]
  const cardWidth = Math.floor((image.width - 384) / 3)
  columns.forEach(([heading, items], columnIndex) => {
    const x = 336 + columnIndex * (cardWidth + 24)
    roundedRect(image, x, 148, cardWidth, 600, 18, '#131d2f')
    text(image, heading, x + 28, 178, 3, '#f8fafc')
    items.forEach((item, itemIndex) => {
      const y = 232 + itemIndex * 94
      const itemScale = item.length > 9 ? 2 : 3
      roundedRect(image, x + 28, y, cardWidth - 56, 64, 14, '#1d2940')
      roundedRect(image, x + 48, y + 17, 30, 30, 8, ['#25d6a2', '#7dd3fc', '#f8bf55', '#f37f98'][itemIndex])
      text(image, item, x + 94, y + (itemScale === 2 ? 20 : 18), itemScale, '#f8fafc')
      text(image, 'HTTPS://EXAMPLE.COM', x + 96, y + 44, 1, '#9fb1c7')
    })
  })
}

function drawPromo(width, height, path, large = false) {
  const image = createImage(width, height, '#0b1220')
  softBackground(image)
  roundedRect(image, 42, 38, width - 84, height - 76, 24, '#131d2f')
  roundedRect(image, 76, 72, 72, 72, 18, '#25d6a2')
  text(image, 'P', 101, 91, 5, '#08131f')
  text(image, 'PERSONAL BOOKMARK', 176, 78, large ? 5 : 3, '#f8fafc')
  text(image, 'DASHBOARD', 176, large ? 126 : 112, large ? 5 : 3, '#f8fafc')
  text(image, 'GROUPED NEW TAB BOOKMARKS', 82, height - 102, large ? 3 : 2, '#9fb1c7')
  roundedRect(image, width - 390, 120, 270, 74, 16, '#1d2940')
  roundedRect(image, width - 372, 143, 28, 28, 8, '#7dd3fc')
  text(image, 'QUICK SAVE', width - 328, 143, 3, '#f8fafc')
  roundedRect(image, width - 340, 220, 230, 58, 14, '#1d2940')
  roundedRect(image, width - 322, 238, 22, 22, 6, '#f8bf55')
  text(image, 'TAGS', width - 286, 238, 3, '#f8fafc')
  if (large) {
    roundedRect(image, width - 470, 320, 350, 74, 16, '#1d2940')
    roundedRect(image, width - 450, 343, 28, 28, 8, '#f37f98')
    text(image, 'BACKUP AND RESTORE', width - 404, 343, 3, '#f8fafc')
  }
  writePng(path, image)
}

const screenshotCopy = [
  ['screenshot-01-dashboard.png', 'PERSONAL BOOKMARK DASHBOARD', 'GROUPED BOOKMARKS ON EVERY NEW TAB'],
  ['screenshot-02-search-tags.png', 'FAST SEARCH AND TAGS', 'FILTER SAVED LINKS WITHOUT LEAVING THE TAB'],
  ['screenshot-03-quick-save.png', 'QUICK SAVE CURRENT PAGE', 'CAPTURE THE ACTIVE TAB INTO YOUR DASHBOARD'],
  ['screenshot-04-organize.png', 'DRAG DROP ORGANIZATION', 'LOCK THE LAYOUT WHEN EVERYTHING IS IN PLACE'],
  ['screenshot-05-backup.png', 'JSON BACKUP AND RESTORE', 'KEEP A PORTABLE COPY OF YOUR BOOKMARK DASHBOARD'],
]

screenshotCopy.forEach(([file, title, subtitle], index) => {
  const image = createImage(1280, 800, '#0b1220')
  drawDashboard(image, title, subtitle, index % 5)
  writePng(join(outputDir, file), image)
})

drawPromo(440, 280, join(outputDir, 'small-promo-tile.png'))
drawPromo(1400, 560, join(outputDir, 'marquee-promo.png'), true)
copyFileSync('public/icons/Icon128.png', join(outputDir, 'icon-128.png'))

console.log(`Generated Chrome Web Store assets in ${outputDir}`)
