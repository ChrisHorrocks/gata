import { formatCampGridReference, formatCampLatLong } from '@/lib/campPosition'

type CampPositionDisplayProps = {
  latitude: number
  longitude: number
  className?: string
}

export function CampPositionDisplay({
  latitude,
  longitude,
  className,
}: CampPositionDisplayProps) {
  const grid = formatCampGridReference(latitude, longitude)
  const latLong = formatCampLatLong(latitude, longitude)

  return (
    <dl className={`grid gap-0.5 text-xs text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-2 ${className ?? ''}`}>
      <dt className="font-medium text-foreground/80">Grid</dt>
      <dd>{grid?.gridReference ?? 'Outside British / Irish grids'}</dd>
      <dt className="font-medium text-foreground/80">Lat / long</dt>
      <dd>{latLong}</dd>
    </dl>
  )
}