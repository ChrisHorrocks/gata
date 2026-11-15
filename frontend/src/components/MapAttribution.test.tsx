import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MapAttribution } from '@/components/MapAttribution'
import { getMapConfig } from '@/config/map'

describe('MapAttribution', () => {
  const config = getMapConfig()

  it('always shows OpenStreetMap credit', () => {
    render(
      <MapAttribution
        config={config}
        terrainAttributionVisible={false}
      />,
    )
    expect(
      screen.getByRole('link', { name: '© OpenStreetMap' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '© Mapterhorn' })).toBeNull()
  })

  it('adds Mapterhorn credit when a terrain layer is on', () => {
    render(
      <MapAttribution
        config={config}
        terrainAttributionVisible
      />,
    )
    const mapterhorn = screen.getByRole('link', { name: '© Mapterhorn' })
    expect(mapterhorn).toHaveAttribute(
      'href',
      'https://mapterhorn.com/attribution',
    )
  })
})