import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { MapTerrainControls } from '@/components/MapTerrainControls'
import {
  readTerrainLayerPrefs,
  type TerrainLayerPrefs,
} from '@/lib/mapTerrainSession'

function TerrainHarness() {
  const [value, setValue] = useState<TerrainLayerPrefs>({
    hillshade: false,
    contours: false,
  })
  return <MapTerrainControls value={value} onChange={setValue} />
}

describe('MapTerrainControls', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('toggles hillshade and contours and persists for the session', async () => {
    const user = userEvent.setup()
    render(<TerrainHarness />)

    await user.click(screen.getByRole('checkbox', { name: /hill shading/i }))
    expect(readTerrainLayerPrefs()).toEqual({ hillshade: true, contours: false })

    await user.click(screen.getByRole('checkbox', { name: /contour lines/i }))
    expect(readTerrainLayerPrefs()).toEqual({ hillshade: true, contours: true })
  })
})