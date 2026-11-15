import { test, expect } from '@playwright/test'
import path from 'node:path'

const artifactsDir = '/opt/cursor/artifacts'

type TerrainConsoleWatch = {
  consoleErrors: string[]
  pageErrors: string[]
  failedUrls: string[]
  elevationRangeResponses: number
}

function watchTerrainConsole(page: import('@playwright/test').Page): TerrainConsoleWatch {
  const watch: TerrainConsoleWatch = {
    consoleErrors: [],
    pageErrors: [],
    failedUrls: [],
    elevationRangeResponses: 0,
  }

  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
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