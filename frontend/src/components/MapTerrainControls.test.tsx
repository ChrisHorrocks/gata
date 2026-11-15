import { cleanup, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MapTerrainControls } from '@/components/MapTerrainControls'

describe('MapTerrainControls', () => {
  afterEach(() => {
    cleanup()
  })

  it('calls onChange when toggles are clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MapTerrainControls
        hillshadeOn={false}
        contoursOn={false}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Hill shading' }))
    expect(onChange).toHaveBeenCalledWith({ hillshade: true, contours: false })

    await user.click(screen.getByRole('checkbox', { name: 'Contour lines' }))
    expect(onChange).toHaveBeenLastCalledWith({
      hillshade: false,
      contours: true,
    })
  })

  it('reflects on state from props', () => {
    render(
      <MapTerrainControls hillshadeOn contoursOn onChange={() => {}} />,
    )
    expect(screen.getByRole('checkbox', { name: 'Hill shading' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Contour lines' })).toBeChecked()
  })
})