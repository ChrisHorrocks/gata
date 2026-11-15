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
        hillshadeOn={false}
        contoursOn={false}
      />,
    )
    expect(
      screen.getByRole('link', { name: '© OpenStreetMap' }),
    ).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
  })

  it('shows Mapterhorn credit only when a terrain layer is on', () => {
    const { rerender } = render(
      <MapAttribution
        config={config}
        hillshadeOn={false}
        contoursOn={false}
      />,
    )
    expect(screen.queryByRole('link', { name: '© Mapterhorn' })).toBeNull()

    rerender(
      <MapAttribution config={config} hillshadeOn contoursOn={false} />,
    )
    const mh = screen.getByRole('link', { name: '© Mapterhorn' })
    expect(mh).toHaveAttribute('href', 'https://mapterhorn.com/attribution')

    rerender(
      <MapAttribution config={config} hillshadeOn={false} contoursOn />,
    )
    expect(screen.getByRole('link', { name: '© Mapterhorn' })).toBeInTheDocument()
  })
})