import { test, expect } from '@playwright/test'
import path from 'node:path'

const artifactsDir = '/opt/cursor/artifacts'

test.describe('terrain layers', () => {
  test('hillshade and contours load without pmtiles:// fetch errors', async (
    { page },
    testInfo,
  ) => {
    const consoleErrors: string[] = []
    const failedUrls: string[] = []
    let elevationRangeResponses = 0

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('requestfailed', (req) => {
      failedUrls.push(`${req.failure()?.errorText ?? 'failed'}: ${req.url()}`)
    })
    page.on('response', (res) => {
      if (
        res.url().includes('dev-elevation.pmtiles') &&
        res.status() === 206
      ) {
        elevationRangeResponses += 1
      }
    })

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
      .poll(() => elevationRangeResponses, { timeout: 60_000 })
      .toBeGreaterThan(2)

    const pmtilesFetchErrors = consoleErrors.filter((line) =>
      /pmtiles:\/\//i.test(line),
    )
    expect(
      pmtilesFetchErrors,
      `unexpected pmtiles:// console errors: ${pmtilesFetchErrors.join('\n')}`,
    ).toEqual([])

    const demFailures = failedUrls.filter(
      (line) =>
        /dev-elevation\.pmtiles/i.test(line) ||
        /gata-dem/i.test(line) ||
        /pmtiles:\/\//i.test(line),
    )
    expect(
      demFailures,
      `unexpected failed DEM requests: ${demFailures.join('\n')}`,
    ).toEqual([])

    const screenshotPath = path.join(
      artifactsDir,
      `terrain-map-${testInfo.project.name}.png`,
    )
    await page.screenshot({ path: screenshotPath, fullPage: true })
  })
})