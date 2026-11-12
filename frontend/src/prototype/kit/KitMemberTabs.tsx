/**
 * Variant member-tabs — per-member tab with pack bar (#6)
 */
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatGrams } from '@/lib/utils'
import { mealSlotLabel, useTripPrototype } from '../TripPrototypeContext'
import { CarrierPicker } from '../shared/CarrierPicker'
import { PackWeightBar } from '../shared/PackWeightBar'

export function KitMemberTabs() {
  const { trip, packWeights, viewingMemberId, setViewingMemberId, assignCarrier, addFromLibrary, libraryForMember, needsCarrierItems } =
    useTripPrototype()

  const shared = trip.gearItems.filter((g) => g.shared)
  const personalFor = (memberId: string) => trip.gearItems.filter((g) => !g.shared && g.ownerId === memberId)

  return (
    <div className="mx-auto max-w-5xl flex-1 space-y-4 p-4 pb-24">
      <PackWeightBar members={trip.members} packWeights={packWeights} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {shared.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <div>
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-muted-foreground">{formatGrams(item.weightGrams)}</span>
                {item.needsCarrier && <Badge className="ml-2" variant="warning">Needs carrier</Badge>}
              </div>
              <CarrierPicker members={trip.members} value={item.carrierId} onChange={(id) => assignCarrier(item.id, id)} />
            </div>
          ))}
        </CardContent>
      </Card>
      {needsCarrierItems.length > 0 && (
        <p className="text-sm text-amber-800">Assign a Carrier for shared kit marked Needs carrier — counts toward Pack weight once set.</p>
      )}
      <Tabs value={viewingMemberId} onValueChange={setViewingMemberId}>
        <TabsList>
          {trip.members.map((m) => (
            <TabsTrigger key={m.id} value={m.id}>
              {m.displayName}
            </TabsTrigger>
          ))}
        </TabsList>
        {trip.members.map((m) => (
          <TabsContent key={m.id} value={m.id} className="space-y-3">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Gear library → Trip gear</CardTitle>
                <span className="text-xs text-muted-foreground">Personal Trip gear items</span>
              </CardHeader>
              <CardContent className="space-y-2">
                {libraryForMember(m.id).map((lib) => {
                  const onTrip = trip.gearItems.some((g) => g.libraryItemId === lib.id)
                  return (
                    <div key={lib.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <span>
                        {lib.name} · {formatGrams(lib.weightGrams)}
                      </span>
                      <Button type="button" size="sm" disabled={onTrip} onClick={() => addFromLibrary(lib)}>
                        <Plus /> Add to Trip
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">On this Trip</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {personalFor(m.id).map((g) => (
                    <li key={g.id} className="flex justify-between border-b py-1">
                      <span>{g.name}</span>
                      <span className="font-mono">{formatGrams(g.weightGrams)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <MealsForMember memberId={m.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function MealsForMember({ memberId }: { memberId: string }) {
  const { trip } = useTripPrototype()
  const meals = trip.meals.filter((m) => m.carrierId === memberId)
  if (meals.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meals carried</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {meals.map((meal) => (
          <div key={meal.id} className="flex justify-between border-b py-1">
            <span>
              {mealSlotLabel(meal.slot)} — {meal.name}
            </span>
            <span>
              {formatGrams(meal.weightGrams)} · {meal.kcal} kcal
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
