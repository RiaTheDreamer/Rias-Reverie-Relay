// @ts-nocheck -- Bun-only subprocess harness; the extension tsconfig excludes host runtime types.
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const variants: string[][] = []
for (const native of [false, true]) for (const review of [false, true]) {
  for (const delayed of [false, true]) for (const empty of [false, true]) {
    variants.push([
      ...(native ? ['--native'] : []), ...(review ? ['--review'] : []),
      ...(delayed ? ['--delayed-save'] : []), ...(empty ? ['--empty-first'] : []),
    ])
  }
}
for (let index = 0; index < variants.length; index += 4) {
  await Promise.all(variants.slice(index, index + 4).map(async flags => {
    const runner = Bun.spawn([Bun.argv[0], fileURLToPath(new URL('./relay-background-lifecycle-smoke.ts', import.meta.url)), ...flags], {
      stdout: 'pipe', stderr: 'pipe',
    })
    const [output, error, code] = await Promise.all([new Response(runner.stdout).text(), new Response(runner.stderr).text(), runner.exited])
    assert.equal(code, 0, `Background Relay ${flags.join(' ') || 'defaults'} failed:\n${output}\n${error}`)
    console.log(output.trim())
  }))
}
console.log(`PASS ${variants.length} background Relay variants, 48 completed/preview-ready mock image jobs. No live providers used.`)
