import { writeTerrainLayerPrefs, type TerrainLayerPrefs } from '@/lib/mapTerrainSession'
import { cn } from '@/lib/utils'

type MapTerrainControlsProps = {
  value: TerrainLayerPrefs
  onChange: (next: TerrainLayerPrefs) => void
  className?: string
}

export function MapTerrainControls({
  value,
  onChange,
  className,
}: MapTerrainControlsProps) {
  const setHillshade = (hillshade: boolean) => {
    const next = { ...value, hillshade }
    writeTerrainLayerPrefs(next)
    onChange(next)
  }

  const setContours = (contours: boolean) => {
    const next = { ...value, contours }
    writeTerrainLayerPrefs(next)
    onChange(next)
  }

  return (
    <fieldset
      className={cn(
        'pointer-events-auto absolute left-2 top-2 flex gap-3 rounded bg-white/90 px-3 py-2 text-xs text-neutral-800 shadow',
        className,
      )}
      data-testid="map-terrain-controls"
    >
      <legend className="sr-only">Terrain layers</legend>
      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={value.hillshade}
          onChange={(e) => setHillshade(e.target.checked)}
          aria-label="Hill shading"
        />
        Hill shading
      </label>
      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={value.contours}
          onChange={(e) => setContours(e.target.checked)}
          aria-label="Contour lines"
        />
        Contour lines
      </label>
    </fieldset>
  )
}