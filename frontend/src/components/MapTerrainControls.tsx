import type { TerrainLayerPrefs } from '@/lib/terrainLayers'

type MapTerrainControlsProps = {
  hillshadeOn: boolean
  contoursOn: boolean
  onChange: (prefs: TerrainLayerPrefs) => void
}

export function MapTerrainControls({
  hillshadeOn,
  contoursOn,
  onChange,
}: MapTerrainControlsProps) {
  return (
    <div
      className="pointer-events-auto absolute left-2 top-2 flex flex-col gap-2 rounded bg-white/95 px-3 py-2 text-sm shadow"
      data-testid="map-terrain-controls"
    >
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={hillshadeOn}
          aria-label="Hill shading"
          onChange={(e) =>
            onChange({ hillshade: e.target.checked, contours: contoursOn })
          }
        />
        Hill shading
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={contoursOn}
          aria-label="Contour lines"
          onChange={(e) =>
            onChange({ hillshade: hillshadeOn, contours: e.target.checked })
          }
        />
        Contour lines
      </label>
    </div>
  )
}