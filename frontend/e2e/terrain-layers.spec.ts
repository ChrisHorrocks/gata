import { test, expect } from '@playwright/test'
import path from 'node:path'

const artifactsDir = '/opt/cursor/artifacts'

type TerrainConsoleWatch = {
  consoleErrors: string[]
  consoleWarnings: string[]
  pageErrors: string[]
  failedUrls: string[]
  font404Urls: string[]
  elevationRangeResponses: number
}

const SNOWDONIA_CENTER: [number, number] = [-3.95, 53.05]

function watchTerrainConsole(page: import('@playwright/test').Page): TerrainConsoleWatch {
  const watch: TerrainConsoleWatch = {
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    failedUrls: [],
    font404Urls: [],
    elevationRangeResponses: 0,
  }

  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error') watch.consoleErrors.push(text)
    if (msg.type() === 'warning') watch.consoleWarnings.push(text)
  })
  page.on('pageerror', (err) => {
    watch.pageErrors.push(err.message)
  })
  page.on('requestfailed', (req) => {
    watch.failedUrls.push(`${req.failure()?.errorText ?? 'failed'}: ${req.url()}`)
  })
  page.on('response', (res) => {
    if (
      res.url().includes('dev-elevation.pmtiles') &&
      res.status() === 206
    ) {
      watch.elevationRangeResponses += 1
    }
    if (res.status() === 404 && /basemaps-assets\/fonts\//i.test(res.url())) {
      watch.font404Urls.push(res.url())
    }
  })

  return watch
}

function assertNoDemTileProblems(watch: TerrainConsoleWatch): void {
  const demConsole = watch.consoleErrors.filter((line) =>
    /DEM tile missing/i.test(line),
  )
  expect(
    demConsole,
    `unexpected DEM missing console errors: ${demConsole.join('\n')}`,
  ).toEqual([])

  const pmtilesFetchErrors = watch.consoleErrors.filter((line) =>
    /pmtiles:\/\//i.test(line),
  )
  expect(
    pmtilesFetchErrors,
    `unexpected pmtiles:// console errors: ${pmtilesFetchErrors.join('\n')}`,
  ).toEqual([])

  expect(
    watch.pageErrors,
    `unexpected page errors: ${watch.pageErrors.join('\n')}`,
  ).toEqual([])

  const demFailures = watch.failedUrls.filter(
    (line) =>
      /dev-elevation\.pmtiles/i.test(line) ||
      /gata-dem/i.test(line) ||
      /pmtiles:\/\//i.test(line),
  )
  expect(
    demFailures,
    `unexpected failed DEM requests: ${demFailures.join('\n')}`,
  ).toEqual([])
}

function assertNoContourGlyphOrMeshWarnings(watch: TerrainConsoleWatch): void {
  expect(
    watch.font404Urls,
    `font glyph 404s: ${watch.font404Urls.join('\n')}`,
  ).toEqual([])

  const glyphErrors = watch.consoleErrors.filter((line) =>
    /Unable to load glyph range/i.test(line),
  )
  expect(
    glyphErrors,
    `glyph load console errors: ${glyphErrors.join('\n')}`,
  ).toEqual([])

  const vertexWarnings = [
    ...watch.consoleWarnings,
    ...watch.consoleErrors,
  ].filter((line) => /Max vertices per segment/i.test(line))
  expect(
    vertexWarnings,
    `MapLibre vertex warnings: ${vertexWarnings.join('\n')}`,
  ).toEqual([])
}

async function exerciseSnowdoniaZoomRange(
  page: import('@playwright/test').Page,
  watch: TerrainConsoleWatch,
): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => Boolean((window as Window & { __gataMap?: unknown }).__gataMap)),
      { timeout: 30_000 },
    )
    .toBe(true)

  for (let zoom = 9; zoom <= 15; zoom += 1) {
    const warningsBefore = watch.consoleWarnings.length
    const errorsBefore = watch.consoleErrors.length
    await page.evaluate(
      ({ center, z }) => {
        const map = (window as Window & { __gataMap?: { setCenter: (c: [number, number]) => void; setZoom: (n: number) => void } })
          .__gataMap
        map?.setCenter(center)
        map?.setZoom(z)
      },
      { center: SNOWDONIA_CENTER, z: zoom },
    )
    await page.evaluate(
      (ms) =>
        new Promise<void>((resolve) => {
          const map = (window as Window & { __gataMap?: { once: (e: string, fn: () => void) => void } })
            .__gataMap
          if (!map) {
            resolve()
            return
          }
          const timer = window.setTimeout(resolve, ms)
          map.once('idle', () => {
            window.clearTimeout(timer)
            resolve()
          })
        }),
      8_000,
    )
    const newWarnings = [
      ...watch.consoleWarnings.slice(warningsBefore),
      ...watch.consoleErrors.slice(errorsBefore),
    ].filter((line) => /Max vertices per segment/i.test(line))
    if (newWarnings.length > 0) {
      throw new Error(
        `vertex warning at zoom ${zoom}: ${newWarnings.join('; ')}`,
      )
    }
  }
}

/** Drag the map west so tiles outside the dev Snowdonia elevation bbox are requested. */
async function panMapWest(page: import('@playwright/test').Page): Promise<void> {
  const canvas = page.locator('canvas.maplibregl-canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('map canvas has no bounding box')

  const startX = box.x + box.width * 0.55
  const startY = box.y + box.height * 0.5
  const endX = box.x + box.width * 0.85
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, startY, { steps: 24 })
  await page.mouse.up()
}

test.describe('terrain layers', () => {
  test('hillshade and contours load without pmtiles:// fetch errors', async (
    { page },
    testInfo,
  ) => {
    const watch = watchTerrainConsole(page)

    await page.addInitScript(() => {
      sessionStorage.setItem('gata.map.hillshade', '1')
      sessionStorage.setItem('gata.map.contours', '1')
    })

    await page.goto('/map')
    await expect(page.locator('canvas.maplibregl-canvas').first()).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.getByRole('checkbox', { name: 'Hill shading' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Contour lines' })).toBeChecked()

    await expect
      .poll(() => watch.elevationRangeResponses, { timeout: 60_000 })
      .toBeGreaterThanOrEqual(2)

    assertNoDemTileProblems(watch)

    await page.getByRole('checkbox', { name: 'Hill shading' }).uncheck()
    await page.getByRole('checkbox', { name: 'Contour lines' }).uncheck()
    await page.waitForTimeout(800)
    await page.getByRole('checkbox', { name: 'Contour lines' }).check()
    await expect(page.getByRole('checkbox', { name: 'Contour lines' })).toBeChecked()
    await page.evaluate(
      (ms) =>
        new Promise<void>((resolve) => {
          const map = (window as Window & { __gataMap?: { once: (e: string, fn: () => void) => void } })
            .__gataMap
          if (!map) {
            resolve()
            return
          }
          const timer = window.setTimeout(resolve, ms)
          map.once('idle', () => {
            window.clearTimeout(timer)
            resolve()
          })
        }),
      8_000,
    )

    watch.consoleWarnings = []
    watch.consoleErrors = []
    watch.font404Urls = []

    await exerciseSnowdoniaZoomRange(page, watch)
    assertNoContourGlyphOrMeshWarnings(watch)

    const screenshotPath = path.join(
      artifactsDir,
      `terrain-map-${testInfo.project.name}.png`,
    )
    await page.screenshot({ path: screenshotPath, fullPage: true })
  })

  test('missing elevation tiles outside dev bbox do not throw', async ({
    page,
  }) => {
    const watch = watchTerrainConsole(page)

    await page.addInitScript(() => {
      sessionStorage.setItem('gata.map.hillshade', '1')
      sessionStorage.setItem('gata.map.contours', '1')
    })

    await page.goto('/map')
    await expect(page.locator('canvas.maplibregl-canvas').first()).toBeVisible({
      timeout: 60_000,
    })

    await expect
      .poll(() => watch.elevationRangeResponses, { timeout: 60_000 })
      .toBeGreaterThanOrEqual(2)

    for (let i = 0; i < 4; i++) {
      await panMapWest(page)
      await page.waitForTimeout(600)
    }

    await page.waitForTimeout(3_000)
    assertNoDemTileProblems(watch)
  })
})