import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { getMapConfig } from '@/config/map'
import { MapScreen } from '@/screens/MapScreen'

vi.mock('@/components/Map', () => ({
  Map: () => {
    const config = getMapConfig()
    return (
      <div data-testid="map-mock">
        <a href={config.attributionUrl}>{config.attributionLabel}</a>
        <span data-testid="map-tile-path">{config.pmtilesPath}</span>
      </div>
    )
  },
}))

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MapScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MapScreen', () => {
  it('shows the map page with configured tile path and OSM credit', () => {
    renderScreen()

    expect(screen.getByRole('heading', { name: 'gata map' })).toBeInTheDocument()
    const credit = screen.getByRole('link', { name: '© OpenStreetMap' })
    expect(credit).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    )
    expect(screen.getByTestId('map-tile-path')).toHaveTextContent(
      '/tiles/dev-small.pmtiles',
    )
  })
})