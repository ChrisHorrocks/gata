import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--enable-webgl',
          ],
        },
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: `${process.env.CADDY_BIN ?? 'caddy'} run --config ${path.join(repoRoot, 'tiles/Caddyfile')}`,
      url: 'http://127.0.0.1:8080/dev-small.pmtiles',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        TILES_ROOT: path.join(repoRoot, 'tiles/data'),
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_TILES_PROXY_TARGET: 'http://127.0.0.1:8080',
        VITE_MAP_PMTILES_PATH: '/tiles/dev-small.pmtiles',
        VITE_MAP_ELEVATION_PMTILES_PATH: '/tiles/dev-elevation.pmtiles',
      },
    },
  ],
})