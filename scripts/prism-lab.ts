// @ts-nocheck -- explicit local artifacts only; this tool never calls a provider.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { renderPrism } from '../src/prismLab'
const input=process.argv[2], output=process.argv[3]
if(!input || !output) { console.error('Usage: bun scripts/prism-lab.ts manifest.json report.html\nImages must be local paths relative to the report. Use actual outgoing diagnostic values. No generation is performed.'); process.exit(1) }
const manifest=JSON.parse(readFileSync(resolve(input),'utf8'))
const html=renderPrism(manifest)
for(const pair of manifest.pairs)for(const run of [pair.control,pair.treatment])if(!existsSync(resolve(dirname(resolve(output)),run.image)))throw Error(`Missing original image: ${run.image}. No report written.`)
mkdirSync(dirname(resolve(output)),{recursive:true});writeFileSync(resolve(output),html)
console.log(`Prism Lab: ${manifest.pairs.length} paired cases → ${resolve(output)}. Awaiting human visual scores.`)
