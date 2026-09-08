import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || process.cwd())
const excluded = new Set(['.git', 'node_modules', 'artifacts', 'authority-source'])
const textExtensions = new Set(['.ts', '.mjs', '.js', '.json', '.md', '.txt', '.jsonl', '.ps1', '.buildmeta', '.gitignore'])
const files = []
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (textExtensions.has(path.extname(entry.name)) || entry.name === '.buildmeta' || entry.name === '.gitignore') files.push(full)
  }
}
walk(root)

const identityTokens = [
  ['G', 'ia'], ['Ga', 'bi'], ['Ye', 'rin'], ['Mi', 'na'], ['Tae', 'ha'],
  ['Chae', 'rin'], ['Su', 'ho'], ['Da', 'som'], ['Ch', 'oi'], ['SO', 'PA'], ['Dream', 'Forum'], ['moonlit', 'fan'],
].map(parts => parts.join(''))
const historicalLabels = [['b', '27'], ['27', 'd']].map(parts => parts.join(''))
const checks = [
  { label: 'personal or story identity', pattern: new RegExp(`\\b(?:${identityTokens.join('|')})\\b`, 'iu') },
  { label: 'historical numbered release', pattern: /\b(?:build\d|build\s+\d|checkpoint\s*\d|rebuild\s+\d)[a-z0-9._-]*\b/iu },
  // Hex colors such as #27d39b are design tokens, not historical build labels.
  { label: 'historical build label', pattern: new RegExp(`(?<!#)\\b(?:${historicalLabels.join('|')})(?:[._-]\\d[\\w.-]*)?\\b`, 'iu') },
  { label: 'old product version', pattern: /\b1\.5\.\d+\b/u },
  { label: 'retired review-era display label', pattern: /\bsurface\s+review\s+v[23]\b/iu },
  { label: 'retired release label', pattern: /\bc5a-emergency-frontend-boot-hotfix\b/iu },
  { label: 'private repository URL', pattern: /github\.com\/[^\s"']+\/Reverie-Relay/iu },
  { label: 'email address', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu },
  { label: 'private absolute path', pattern: /\b[A-Z]:(?:\\|\/)Users(?:\\|\/)[^\\/\s]+/iu },
]

const violations = []
for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/')
  // Data URLs are binary payloads, not prose or identifiers. Scan their
  // surrounding transport code while preventing coincidental base64 syllables
  // from being misreported as a personal name.
  const text = fs.readFileSync(file, 'utf8').replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, '[embedded-image-data]')
  for (const check of checks) {
    const match = check.pattern.exec(text)
    if (match) violations.push(`${relative}: ${check.label}: ${match[0]}`)
    if (['personal or story identity', 'historical numbered release', 'historical build label', 'old product version'].includes(check.label)) {
      const pathMatch = check.pattern.exec(relative)
      if (pathMatch) violations.push(`${relative}: filename ${check.label}: ${pathMatch[0]}`)
    }
  }
}

if (violations.length) throw new Error(`Source hygiene violations:\n${violations.join('\n')}`)
console.log(`source hygiene smoke ok (${files.length} text files, zero violations)`)
