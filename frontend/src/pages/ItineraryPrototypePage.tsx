/**
 * Throwaway itinerary screen prototype — issue #6
 */
import { ITINERARY_VARIANTS, type ItineraryVariantId } from '@/prototype/itinerary/variantConfig'
import { ItineraryMapSplit } from '@/prototype/itinerary/ItineraryMapSplit'
import { ItineraryTableStrip } from '@/prototype/itinerary/ItineraryTableStrip'
import { ItineraryTimeline } from '@/prototype/itinerary/ItineraryTimeline'
import { PrototypeBanner } from '@/prototype/PrototypeBanner'
import { VariantSwitcher } from '@/prototype/VariantSwitcher'
import { useVariant } from '@/prototype/useVariant'

const IDS = ITINERARY_VARIANTS.map((v) => v.id)

export function ItineraryPrototypePage() {
  const { variant, step } = useVariant(IDS, 'map-split')
  const meta = ITINERARY_VARIANTS.find((v) => v.id === variant)!

  return (
    <div className="flex min-h-screen flex-col">
      <PrototypeBanner screen="itinerary" />
      {variant === 'map-split' && <ItineraryMapSplit />}
      {variant === 'timeline' && <ItineraryTimeline />}
      {variant === 'table-strip' && <ItineraryTableStrip />}
      <VariantSwitcher
        label={meta.label}
        variant={variant as ItineraryVariantId}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </div>
  )
}
