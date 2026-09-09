import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const assert = (value, message) => { if (!value) throw new Error(message) }
for (const file of ['dist/backend.js', 'dist/frontend.js']) {
  const full = path.join(root, file)
  assert(fs.existsSync(full), `${file} is missing`)
  const source = fs.readFileSync(full, 'utf8')
  assert(source.length > 20_000, `${file} is unexpectedly small`)
  assert(!/from\s+["']\.\.?\//.test(source), `${file} retains an unresolved relative import`)
  assert(source.includes('0.2.1'), `${file} does not contain the current release version`)
}
console.log('dist dependency and version smoke passed.')
