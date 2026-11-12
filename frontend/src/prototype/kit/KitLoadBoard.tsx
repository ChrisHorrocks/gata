/**
 * Variant load-board — column layout for kit domains (#6)
 */
import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatGrams } from '@/lib/utils'
import { mealSlotLabel, useTripPrototype } from '../TripPrototypeContext'
import { CarrierPicker } from '../shared/CarrierPicker'
import { PackWeightBar } from '../shared/PackWeightBar'

export function KitLoadBoard() {
  const { trip, packWeights, assignCarrier, addFromLibrary, libraryForMember, needsCarrierItems } = useTripPrototype()
  const personal = trip.gearItems.filter((g) => !g.shared)
  const shared = trip.gearItems.filter((g) => g.shared && !g.needsCarrier)
  const meals = trip.meals

  return (
    <div className="mx-auto max-w-7xl flex-1 space-y-4 p-4 pb-24">
      <PackWeightBar members={trip.members} packWeights={packWeights} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Column title="Personal Trip gear items">
          {personal.map((g) => {
            const owner = trip.members.find((m) => m.id === g.ownerId)
            return (
              <CardRow key={g.id} title={g.name} meta={`${formatGrams(g.weightGrams)} · ${owner?.displayName ?? ''}`} />
            )
          })}
          <p className="text-xs text-muted-foreground">Add from a Member&apos;s Gear library:</p>
          {trip.members.map((m) => (
            <div key={m.id} className="space-y-1">
              <p className="text-xs font-medium">{m.displayName}</p>
              {libraryForMember(m.id).slice(0, 2).map((lib) => (
                <Button key={lib.id} type="button" size="sm" variant="ghost" className="h-7 w-full justify-start text-xs" onClick={() => addFromLibrary(lib)}>
                  <Plus className="!w-3 !h-3" /> {lib.name}
                </Button>
              ))}
            </div>
          ))}
        </Column>
        <Column title="Shared items">
          {shared.map((item) => (
            <div key={item.id} className="rounded-md border bg-card p-2 text-xs">
              <CardRow title={item.name} meta={formatGrams(item.weightGrams)} />
              <div className="mt-2">
                <CarrierPicker members={trip.members} value={item.carrierId} onChange={(id) => assignCarrier(item.id, id)} />
              </div>
            </div>
          ))}
        </Column>
        <Column title="Meals">
          {meals.map((meal) => {
            const carrier = trip.members.find((m) => m.id === meal.carrierId)
            return (
              <CardRow
                key={meal.id}
                title={meal.name}
                meta={`${mealSlotLabel(meal.slot)} · ${formatGrams(meal.weightGrams)} · ${meal.kcal} kcal`}
                footer={`Carrier: ${carrier?.displayName ?? '—'}`}
              />
            )
          })}
        </Column>
        <Column title="Needs carrier">
          {needsCarrierItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing needs a Carrier.</p>
          ) : (
            needsCarrierItems.map((item) => (
              <div key={item.id} className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs">
                <div className="flex items-center gap-1">
                  <Badge variant="warning">Needs carrier</Badge>
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="mt-2">
                  <CarrierPicker members={trip.members} value={item.carrierId} onChange={(id) => assignCarrier(item.id, id)} />
                </div>
              </div>
            ))
          )}
        </Column>
      </div>
    </div>
  )
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[280px] flex-col rounded-lg border bg-muted/20 p-3">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">{children}</div>
    </div>
  )
}

function CardRow({ title, meta, footer }: { title: string; meta: string; footer?: string }) {
  return (
    <div className="rounded-md border bg-card p-2 shadow-sm">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{meta}</p>
      {footer && <p className="mt-1 text-[10px] text-muted-foreground">{footer}</p>}
    </div>
  )
}
