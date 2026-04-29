import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const sourceDir = 'dist'
const outputPath = 'release/personal-bookmark-dashboard-0.1.0.zip'

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

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980)
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { day, time }
}

function collectFiles(dir) {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry)
      const stats = statSync(path)
      return stats.isDirectory() ? collectFiles(path) : [path]
    })
    .sort()
}

function uint16(value) {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16LE(value)
  return buffer
}

function uint32(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value)
  return buffer
}

if (!statSync(join(sourceDir, 'manifest.json')).isFile()) {
  throw new Error('dist/manifest.json is missing. Run npm run build first.')
}

const localParts = []
const centralParts = []
let offset = 0

for (const file of collectFiles(sourceDir)) {
  const data = readFileSync(file)
  const stats = statSync(file)
  const name = relative(sourceDir, file).split(sep).join('/')
  const nameBuffer = Buffer.from(name)
  const crc = crc32(data)
  const { day, time } = dosDateTime(stats.mtime)

  const localHeader = Buffer.concat([
    uint32(0x04034b50),
    uint16(20),
    uint16(0),
    uint16(0),
    uint16(time),
    uint16(day),
    uint32(crc),
    uint32(data.length),
    uint32(data.length),
    uint16(nameBuffer.length),
    uint16(0),
    nameBuffer,
  ])

  const centralHeader = Buffer.concat([
    uint32(0x02014b50),
    uint16(20),
    uint16(20),
    uint16(0),
    uint16(0),
    uint16(time),
    uint16(day),
    uint32(crc),
    uint32(data.length),
    uint32(data.length),
    uint16(nameBuffer.length),
    uint16(0),
    uint16(0),
    uint16(0),
    uint16(0),
    uint32(0),
    uint32(offset),
    nameBuffer,
  ])

  localParts.push(localHeader, data)
  centralParts.push(centralHeader)
  offset += localHeader.length + data.length
}

const centralDirectory = Buffer.concat(centralParts)
const endOfCentralDirectory = Buffer.concat([
  uint32(0x06054b50),
  uint16(0),
  uint16(0),
  uint16(centralParts.length),
  uint16(centralParts.length),
  uint32(centralDirectory.length),
  uint32(offset),
  uint16(0),
])

mkdirSync('release', { recursive: true })
writeFileSync(outputPath, Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]))

console.log(`Created ${outputPath}`)
