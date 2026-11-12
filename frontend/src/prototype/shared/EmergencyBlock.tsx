import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Member, Trip } from '../types'

export function EmergencyBlock({ trip }: { trip: Trip }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Emergency contacts &amp; notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="font-medium">Emergency notes: </span>
          {trip.emergencyNotes || '—'}
        </p>
        <ul className="space-y-2">
          {trip.members.map((m: Member) => (
            <li key={m.id} className="rounded-md border p-2">
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="font-medium">
                  {m.displayName}
                  {m.role === 'organiser' && <span className="ml-1 text-xs text-muted-foreground">(Organiser)</span>}
                </div>
                <ul className="mt-1 text-xs text-muted-foreground">
                  {m.emergencyContacts.map((c) => (
                    <li key={c.phone}>
                      {c.name} · {c.relationship} · {c.phone}
                    </li>
                  ))}
                </ul>
              </form>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
