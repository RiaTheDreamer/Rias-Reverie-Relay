import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const brands = {
  public: { name: "Ria's Reverie Relay", shortName: 'Reverie', readmeHeading: 'Reverie Relay' },
  private: { name: 'Private Reverie', shortName: 'Private', readmeHeading: 'Private Reverie' },
}

export function targetFromRepository(repositoryUrl) {
  const normalized = String(repositoryUrl).trim()
    .replace(/^(?:ssh:\/\/)?git@github\.com[:/]/i, 'https://github.com/')
    .replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase()
  if (normalized === 'https://github.com/riathedreamer/rias-reverie-relay') return 'public'
  if (normalized === 'https://github.com/riathedreamer/private-relay') return 'private'
  throw new Error('Cannot infer the distribution from this repository. Specify --target=public or --target=private for a source archive or fork.')
}

// A private worktree can have a public origin. Its upstream identifies the
// normal release destination; an explicit --target checks a different target.
export function repositoryForBuild(root, git = args => execFileSync('git', args, {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim()) {
  const optional = args => { try { return git(args) || '' } catch { return '' } }
  const branch = optional(['symbolic-ref', '--quiet', '--short', 'HEAD'])
  const upstreamRemote = branch ? optional(['config', '--get', `branch.${branch}.remote`]) : ''
  const remote = upstreamRemote && upstreamRemote !== '.' ? upstreamRemote : 'origin'
  const repositoryUrl = optional(['remote', 'get-url', remote])
  if (!repositoryUrl) throw new Error('No release repository found. Specify --target=public or --target=private for a source archive.')
  return repositoryUrl
}

export function validateDistributionBranding({ target, manifest, frontend, readme }) {
  const brand = brands[target]
  if (!brand) throw new Error('Distribution target must be public or private.')
  const requireMatch = (condition, label) => {
    if (!condition) throw new Error(`${target} distribution branding mismatch: ${label}; expected ${brand.name}. Do not promote private display labels to public staging.`)
  }
  requireMatch(manifest.name === brand.name, 'extension name')
  requireMatch(manifest.identifier === (target === 'public' ? 'reverie_relay' : 'private_relay'), 'preserved install identifier')
  for (const [label, snippet] of [
    ['drawer title', `title: "${brand.name}"`],
    ['drawer header', `headerTitle: "${brand.name}"`],
    ['sidebar label', `shortName: '${brand.shortName}'`],
    ['open action', `label: "Open ${brand.name}"`],
    ['dashboard heading', `title.textContent = "${brand.name}"`],
  ]) requireMatch(frontend.includes(snippet), label)
  requireMatch(readme.match(/^# (.+)$/m)?.[1].trim() === brand.readmeHeading, 'README heading')
  return brand.name
}

export function checkDistributionBranding(root, requestedTarget) {
  const target = requestedTarget || targetFromRepository(repositoryForBuild(root))
  const read = relative => readFileSync(resolve(root, relative), 'utf8')
  const name = validateDistributionBranding({
    target,
    manifest: JSON.parse(read('spindle.json')),
    frontend: read('src/frontend.ts'),
    readme: read('README.md'),
  })
  return { target, name }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const targetArgument = process.argv.slice(2)
  if (targetArgument.length > 1 || (targetArgument.length && !/^--target=(public|private)$/.test(targetArgument[0]))) {
    throw new Error('Usage: bun scripts/distribution-branding.mjs [--target=public|private]')
  }
  const result = checkDistributionBranding(root, targetArgument[0]?.split('=')[1])
  console.log(`Distribution branding passed: ${result.target} / ${result.name}.`)
}
