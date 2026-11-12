/**
 * Variant table-strip — spreadsheet days + horizontal map (#6)
 */
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ItineraryMap } from '../ItineraryMap'
import { useTripPrototype } from '../TripPrototypeContext'

export function ItineraryTableStrip() {
  const {
    trip,
    selectedDayId,
    setSelectedDayId,
    updateDayStats,
    setDayKind,
    reorderDay,
    addWalkingDay,
    placeCamp,
  } = useTripPrototype()

  const onMapClick =
    selectedDayId && trip.days.find((d) => d.id === selectedDayId)?.kind === 'walking'
      ? (lat: number, lng: number) => placeCamp(selectedDayId, lat, lng)
      : undefined

  return (
    <div className="mx-auto max-w-7xl flex-1 space-y-4 p-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Day table (hand-entered)</h2>
        <Button type="button" size="sm" onClick={addWalkingDay}>
          <Plus /> Row: walking Day
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <th className="p-2">#</th>
              <th className="p-2">Kind</th>
              <th className="p-2">km</th>
              <th className="p-2">Ascent m</th>
              <th className="p-2">Descent m</th>
              <th className="p-2">Camp</th>
              <th className="p-2">Order</th>
            </tr>
          </thead>
          <tbody>
            {trip.days.map((day, i) => {
              const camp = trip.camps.find((c) => c.id === day.campId)
              const selected = selectedDayId === day.id
              return (
                <tr
                  key={day.id}
                  className={`border-b cursor-pointer ${selected ? 'bg-accent/50' : 'hover:bg-muted/30'}`}
                  onClick={() => setSelectedDayId(day.id)}
                >
                  <td className="p-2 font-mono">{i + 1}</td>
                  <td className="p-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDayKind(day.id, day.kind === 'rest' ? 'walking' : 'rest')
                      }}
                    >
                      {day.kind === 'rest' ? 'Rest day' : 'Walking day'}
                    </Button>
                  </td>
                  <td className="p-2">
                    {day.kind === 'walking' ? (
                      <Input
                        className="h-8 w-20"
                        type="number"
                        value={day.distanceKm}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateDayStats(day.id, { distanceKm: Number(e.target.value) })}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-2">
                    {day.kind === 'walking' ? (
                      <Input
                        className="h-8 w-20"
                        type="number"
                        value={day.ascentM}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateDayStats(day.id, { ascentM: Number(e.target.value) })}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-2">
                    {day.kind === 'walking' ? (
                      <Input
                        className="h-8 w-20"
                        type="number"
                        value={day.descentM ?? ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateDayStats(day.id, { descentM: Number(e.target.value) })}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-2 text-xs">{camp?.name ?? '—'}</td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); reorderDay(day.id, 'up') }}>
                        ↑
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); reorderDay(day.id, 'down') }}>
                        ↓
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Select a row, then click the map strip to place or move the Camp for that walking Day.
      </p>
      <ItineraryMap
        className="h-[220px]"
        days={trip.days}
        camps={trip.camps}
        selectedDayId={selectedDayId}
        onMapClick={onMapClick}
        compact
      />
    </div>
  )
}
