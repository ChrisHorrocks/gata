/**
 * Floating bottom-centre variant switcher — does not steal focus from inputs (#6)
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VariantSwitcherProps {
  label: string
  variant: string
  onPrev: () => void
  onNext: () => void
  className?: string
}

export function VariantSwitcher({ label, variant, onPrev, onNext, className }: VariantSwitcherProps) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4',
        className,
      )}
      aria-live="polite"
    >
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-full border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-sm"
        data-variant-switcher
      >
        <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onPrev} aria-label="Previous variant">
          <ChevronLeft />
        </Button>
        <div className="min-w-[10rem] text-center text-xs sm:text-sm">
          <div className="font-medium">{label}</div>
          <div className="text-muted-foreground">variant={variant}</div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onNext} aria-label="Next variant">
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
