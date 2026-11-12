import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Camp, Day } from '../types'

interface DayFieldsProps {
  day: Day
  dayNumber: number
  camp: Camp | undefined
  selected: boolean
  onSelect: () => void
  onUpdate: (patch: Partial<Pick<Day, 'distanceKm' | 'ascentM' | 'descentM'>>) => void
  onSetRest: () => void
  onSetWalking: () => void
  onMove: (dir: 'up' | 'down') => void
}

export function DayFields({
  day,
  dayNumber,
  camp,
  selected,
  onSelect,
  onUpdate,
  onSetRest,
  onSetWalking,
  onMove,
}: DayFieldsProps) {
  const isRest = day.kind === 'rest'

  return (
    <div
      className={`rounded-lg border p-3 ${selected ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">{dayNumber}</span>
          <span className="font-medium">Day</span>
          {isRest ? (
            <span className="text-xs text-muted-foreground">Rest day — stays at previous Camp</span>
          ) : (
            <span className="text-xs text-muted-foreground">Walking day</span>
          )}
        </div>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onMove('up') }}>
            ↑
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onMove('down') }}>
            ↓
          </Button>
          {isRest ? (
            <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onSetWalking() }}>
              Mark walking
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onSetRest() }}>
              Rest day
            </Button>
          )}
        </div>
      </div>
      {!isRest && (
        <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
          <div>
            <Label className="text-xs">Distance (km)</Label>
            <Input
              type="number"
              step="0.1"
              value={day.distanceKm}
              onChange={(e) => onUpdate({ distanceKm: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Ascent (m)</Label>
            <Input
              type="number"
              value={day.ascentM}
              onChange={(e) => onUpdate({ ascentM: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Descent (m)</Label>
            <Input
              type="number"
              value={day.descentM ?? ''}
              onChange={(e) => onUpdate({ descentM: Number(e.target.value) })}
            />
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Camp: <span className="text-foreground">{camp?.name ?? '—'}</span>
        {camp && (
          <span>
            {' '}
            ({camp.lat.toFixed(4)}, {camp.lng.toFixed(4)})
          </span>
        )}
        {selected && !isRest && <span className="block text-primary">Click the map to place or move this Camp.</span>}
      </p>
    </div>
  )
}
