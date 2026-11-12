/**
 * Variant timeline — list-primary with sticky map (#6)
 */
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ItineraryMap } from '../ItineraryMap'
import { useTripPrototype } from '../TripPrototypeContext'
import { DayFields } from '../shared/DayFields'

export function ItineraryTimeline() {
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
    <div className="mx-auto flex max-w-6xl flex-1 gap-6 p-4 pb-24">
      <div className="min-w-0 flex-1">
        <Card className="mb-4 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trip timeline</CardTitle>
            <p className="text-xs text-muted-foreground">Ordered Days — each walking Day ends at a Camp</p>
          </CardHeader>
          <CardContent>
            <Button type="button" size="sm" variant="secondary" onClick={addWalkingDay}>
              <Plus /> Insert walking Day
            </Button>
          </CardContent>
        </Card>
        <div className="relative space-y-0">
          <div className="absolute bottom-4 left-4 top-4 w-0.5 bg-border" aria-hidden />
          {trip.days.map((day, i) => (
            <div key={day.id} className="relative pl-10 pb-4">
              <span className="absolute left-2 top-4 z-10 h-4 w-4 rounded-full border-2 border-primary bg-card" />
              <DayFields
                day={day}
                dayNumber={i + 1}
                camp={trip.camps.find((c) => c.id === day.campId)}
                selected={selectedDayId === day.id}
                onSelect={() => setSelectedDayId(day.id)}
                onUpdate={(patch) => updateDayStats(day.id, patch)}
                onSetRest={() => setDayKind(day.id, 'rest')}
                onSetWalking={() => setDayKind(day.id, 'walking')}
                onMove={(dir) => reorderDay(day.id, dir)}
              />
            </div>
          ))}
        </div>
      </div>
      <aside className="hidden w-[340px] shrink-0 lg:block">
        <div className="sticky top-20 space-y-2">
          <p className="text-sm font-medium">Camp map</p>
          <ItineraryMap
            className="h-[420px]"
            days={trip.days}
            camps={trip.camps}
            selectedDayId={selectedDayId}
            onMapClick={onMapClick}
            compact
          />
        </div>
      </aside>
    </div>
  )
}
