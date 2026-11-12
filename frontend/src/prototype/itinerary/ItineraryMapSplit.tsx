/**
 * Variant map-split — map-primary layout (#6)
 */
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ItineraryMap } from '../ItineraryMap'
import { useTripPrototype } from '../TripPrototypeContext'
import { DayFields } from '../shared/DayFields'
import { EmergencyBlock } from '../shared/EmergencyBlock'

export function ItineraryMapSplit() {
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
    <div className="mx-auto grid max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]">
      <ItineraryMap
        className="min-h-[420px] lg:min-h-[calc(100vh-11rem)]"
        days={trip.days}
        camps={trip.camps}
        selectedDayId={selectedDayId}
        onMapClick={onMapClick}
      />
      <div className="flex flex-col gap-3 pb-20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Days in this Trip</h2>
          <Button type="button" size="sm" onClick={addWalkingDay}>
            <Plus /> Add walking Day
          </Button>
        </div>
        <div className="space-y-2 overflow-y-auto">
          {trip.days.map((day, i) => (
            <DayFields
              key={day.id}
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
          ))}
        </div>
        <EmergencyBlock trip={trip} />
      </div>
    </div>
  )
}
