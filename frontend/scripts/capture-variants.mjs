import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE = 'http://localhost:5173/gata/'
const OUT = '/opt/cursor/artifacts/prototype-variants'
mkdirSync(OUT, { recursive: true })

const shots = [
  ['itinerary-map-split', '#/prototype/itinerary?variant=map-split'],
  ['itinerary-timeline', '#/prototype/itinerary?variant=timeline'],
  ['itinerary-table-strip', '#/prototype/itinerary?variant=table-strip'],
  ['kit-member-tabs', '#/prototype/kit?variant=member-tabs'],
  ['kit-shared-first', '#/prototype/kit?variant=shared-first'],
  ['kit-load-board', '#/prototype/kit?variant=load-board'],
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

for (const [name, hash] of shots) {
  await page.goto(BASE + hash, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(4000)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true })
  console.log('saved', name)
}

await browser.close()
