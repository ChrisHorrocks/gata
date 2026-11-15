import { Link } from 'react-router-dom'

import { Map } from '@/components/Map'

export function MapScreen() {
  return (
    <div className="flex min-h-svh flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <h1 className="text-lg font-semibold">gata map</h1>
        <Link className="text-sm text-blue-700 underline" to="/health">
          Health check
        </Link>
      </header>
      <main className="flex flex-1 flex-col p-4">
        <p className="mb-2 text-sm text-neutral-600">
          Self-hosted Protomaps basemap with optional Mapterhorn hillshade and
          Explorer-style contours. Map rendering is checked by hand; Vitest
          covers toggles, session prefs, and credits.
        </p>
        <div className="flex-1 overflow-hidden rounded-lg border bg-white shadow-sm">
          <Map className="min-h-[480px]" />
        </div>
      </main>
    </div>
  )
}