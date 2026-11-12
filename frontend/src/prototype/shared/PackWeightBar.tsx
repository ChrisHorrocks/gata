import { formatGrams } from '@/lib/utils'
import type { Member } from '../types'

export function PackWeightBar({ members, packWeights }: { members: Member[]; packWeights: Record<string, number> }) {
  const max = Math.max(...members.map((m) => packWeights[m.id] ?? 0), 1)

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pack weight (derived)</p>
      {members.map((m) => {
        const w = packWeights[m.id] ?? 0
        const pct = (w / max) * 100
        return (
          <div key={m.id}>
            <div className="flex justify-between text-sm">
              <span>
                {m.displayName}
                {m.role === 'organiser' && <span className="text-xs text-muted-foreground"> · Organiser</span>}
              </span>
              <span className="font-mono text-sm">{formatGrams(w)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
