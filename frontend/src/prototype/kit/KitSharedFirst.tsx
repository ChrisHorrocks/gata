/**
 * Variant shared-first — carriers and shared kit dominate (#6)
 */
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatGrams } from '@/lib/utils'
import { mealSlotLabel, useTripPrototype } from '../TripPrototypeContext'
import { CarrierPicker } from '../shared/CarrierPicker'

export function KitSharedFirst() {
  const { trip, packWeights, assignCarrier, addFromLibrary, libraryForMember } = useTripPrototype()
  const shared = trip.gearItems.filter((g) => g.shared)

  return (
    <div className="mx-auto max-w-4xl flex-1 p-4 pb-24">
      <section className="rounded-xl border-2 border-primary/30 bg-accent/30 p-4">
        <h2 className="text-lg font-semibold">Shared items &amp; Carriers</h2>
        <p className="text-sm text-muted-foreground">Each Shared item has exactly one Carrier. Pack weight updates live.</p>
        <div className="mt-4 grid gap-3">
          {shared.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-lg bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{formatGrams(item.weightGrams)}</p>
              </div>
              <div className="flex items-center gap-2">
                {item.needsCarrier && <Badge variant="warning">Needs carrier</Badge>}
                <CarrierPicker members={trip.members} value={item.carrierId} onChange={(id) => assignCarrier(item.id, id)} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {trip.members.map((m) => (
            <span key={m.id}>
              {m.displayName}: <strong className="font-mono">{formatGrams(packWeights[m.id] ?? 0)}</strong>
            </span>
          ))}
        </div>
      </section>

      <Separator className="my-6" />

      <section>
        <h2 className="mb-2 text-lg font-semibold">Meals (weight → Pack weight)</h2>
        <div className="space-y-1 text-sm">
          {trip.meals.map((meal) => {
            const carrier = trip.members.find((m) => m.id === meal.carrierId)
            return (
              <div key={meal.id} className="flex justify-between rounded border px-3 py-2">
                <span>
                  {mealSlotLabel(meal.slot)} · {meal.name}
                </span>
                <span className="text-muted-foreground">
                  {formatGrams(meal.weightGrams)} · {meal.kcal} kcal · Carrier: {carrier?.displayName ?? '—'}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <Separator className="my-6" />

      {trip.members.map((m) => (
        <section key={m.id} className="mb-6">
          <h3 className="font-medium">
            {m.displayName}
            {m.role === 'organiser' && <span className="text-xs text-muted-foreground"> (Organiser)</span>}
            — Gear library
          </h3>
          <ul className="mt-2 space-y-1">
            {libraryForMember(m.id).map((lib) => (
              <li key={lib.id} className="flex items-center justify-between text-sm">
                <span>{lib.name}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => addFromLibrary(lib)}>
                  <Plus /> Trip gear item
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
