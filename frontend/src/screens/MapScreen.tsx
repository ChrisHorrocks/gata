import { Link } from 'react-router-dom'

import { Map } from '@/components/Map'

export function MapScreen() {
  return (
    <div className="flex h-svh min-h-0 flex-col bg-neutral-50">
      <header className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-3">
        <h1 className="text-lg font-semibold">gata map</h1>
        <Link className="text-sm text-blue-700 underline" to="/health">
          Health check
        </Link>
      </header>
      <main className="flex min-h-0 flex-1 flex-col p-4">
        <p className="mb-2 shrink-0 text-sm text-neutral-600">
          Self-hosted Protomaps basemap with optional hill shading and
          Explorer-style contours from Mapterhorn elevation tiles. Map rendering
          is checked by hand; automated tests cover toggles and credit.
        </p>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-white shadow-sm">
          <Map className="absolute inset-0" />
        </div>
      </main>
    </div>
  )
}