import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'

export function PrototypeBanner({ screen }: { screen: 'itinerary' | 'kit' }) {
  const other = screen === 'itinerary' ? '/prototype/kit' : '/prototype/itinerary'
  const otherLabel = screen === 'itinerary' ? 'Kit' : 'Itinerary'

  return (
    <header className="border-b bg-card/80 px-4 py-2 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">Throwaway prototype</Badge>
          <span className="text-sm font-medium">Trip: Pennine Way slice</span>
          <span className="text-xs text-muted-foreground">Issue #6 — layout &amp; interactions</span>
        </div>
        <nav className="flex gap-3 text-sm">
          <span className="font-semibold capitalize">{screen}</span>
          <Link to={other} className="text-primary underline-offset-4 hover:underline">
            {otherLabel} screen
          </Link>
        </nav>
      </div>
    </header>
  )
}
