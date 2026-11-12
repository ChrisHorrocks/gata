/**
 * Throwaway kit screen prototype — issue #6
 */
import { KitLoadBoard } from '@/prototype/kit/KitLoadBoard'
import { KitMemberTabs } from '@/prototype/kit/KitMemberTabs'
import { KitSharedFirst } from '@/prototype/kit/KitSharedFirst'
import { KIT_VARIANTS, type KitVariantId } from '@/prototype/kit/variantConfig'
import { PrototypeBanner } from '@/prototype/PrototypeBanner'
import { VariantSwitcher } from '@/prototype/VariantSwitcher'
import { useVariant } from '@/prototype/useVariant'

const IDS = KIT_VARIANTS.map((v) => v.id)

export function KitPrototypePage() {
  const { variant, step } = useVariant(IDS, 'member-tabs')
  const meta = KIT_VARIANTS.find((v) => v.id === variant)!

  return (
    <div className="flex min-h-screen flex-col">
      <PrototypeBanner screen="kit" />
      {variant === 'member-tabs' && <KitMemberTabs />}
      {variant === 'shared-first' && <KitSharedFirst />}
      {variant === 'load-board' && <KitLoadBoard />}
      <VariantSwitcher label={meta.label} variant={variant as KitVariantId} onPrev={() => step(-1)} onNext={() => step(1)} />
    </div>
  )
}
