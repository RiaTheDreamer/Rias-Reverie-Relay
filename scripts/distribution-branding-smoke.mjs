import assert from 'node:assert/strict'
import { repositoryForBuild, targetFromRepository, validateDistributionBranding } from './distribution-branding.mjs'

const publicUrl = 'https://github.com/RiaTheDreamer/Rias-Reverie-Relay.git'
const privateUrl = 'https://github.com/RiaTheDreamer/Private-Relay.git'
const fixture = target => {
  const name = target === 'private' ? 'Private Reverie' : "Ria's Reverie Relay"
  const shortName = target === 'private' ? 'Private' : 'Reverie'
  const readmeHeading = target === 'private' ? name : 'Reverie Relay'
  return {
    target, manifest: { name, identifier: target === 'public' ? 'reverie_relay' : 'private_relay' }, readme: `<p>Logo</p>\r\n\r\n# ${readmeHeading}\r\n`,
    frontend: `title: "${name}",\nheaderTitle: "${name}",\nshortName: '${shortName}',\nlabel: "Open ${name}",\ntitle.textContent = "${name}"`,
  }
}

assert.equal(targetFromRepository(publicUrl), 'public')
assert.equal(targetFromRepository(privateUrl), 'private')
assert.equal(targetFromRepository('git' + '@github.com:RiaTheDreamer/Private-Relay.git'), 'private')
assert.equal(targetFromRepository('ssh://git' + '@github.com/RiaTheDreamer/Rias-Reverie-Relay.git/'), 'public')
assert.throws(() => targetFromRepository('https://github.com/example/unknown'), /Cannot infer/)
assert.equal(validateDistributionBranding(fixture('public')), "Ria's Reverie Relay")
assert.equal(validateDistributionBranding(fixture('private')), 'Private Reverie')
assert.throws(() => validateDistributionBranding({ ...fixture('private'), target: 'public' }), /public distribution branding mismatch/)
assert.throws(() => validateDistributionBranding({ ...fixture('public'), target: 'private' }), /private distribution branding mismatch/)
assert.throws(() => validateDistributionBranding({ ...fixture('private'), frontend: fixture('public').frontend }), /drawer title/)
assert.throws(() => validateDistributionBranding({ ...fixture('private'), readme: fixture('public').readme }), /README heading/)
assert.throws(() => validateDistributionBranding({ ...fixture('private'), manifest: { name: 'Private Reverie', identifier: 'renamed' } }), /install identifier/)

for (const [label, expected] of [
  ['headerTitle: "Private Reverie"', 'drawer header'],
  ["shortName: 'Private'", 'sidebar label'],
  ['label: "Open Private Reverie"', 'open action'],
  ['title.textContent = "Private Reverie"', 'dashboard heading'],
]) assert.throws(() => validateDistributionBranding({ ...fixture('private'), frontend: fixture('private').frontend.replace(label, '') }), new RegExp(expected))

const gitForPrivateWorktree = args => {
  if (args[0] === 'symbolic-ref') return 'codex/private-release'
  if (args[0] === 'config') return 'private'
  if (args.join(' ') === 'remote get-url private') return privateUrl
  if (args.join(' ') === 'remote get-url origin') return publicUrl
  throw new Error('Unexpected git read')
}
assert.equal(repositoryForBuild('.', gitForPrivateWorktree), privateUrl, 'private upstream must win over a public origin')
assert.equal(repositoryForBuild('.', args => {
  if (args[0] === 'symbolic-ref') throw new Error('Detached HEAD')
  assert.deepEqual(args, ['remote', 'get-url', 'origin'])
  return publicUrl
}), publicUrl, 'installed/detached clones must use origin')
assert.throws(() => repositoryForBuild('.', () => { throw new Error('No repository') }), /No release repository/)
console.log('Distribution branding smoke passed: both brands, cross-distribution rejection, each UI label, install identity, and upstream/origin selection.')
