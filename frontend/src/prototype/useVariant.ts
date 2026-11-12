/**
 * ?variant= URL param for throwaway UI comparisons (#6)
 */
import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useVariant(variantIds: readonly string[], defaultId: string) {
  const [searchParams, setSearchParams] = useSearchParams()

  const variant = useMemo(() => {
    const raw = searchParams.get('variant')
    if (raw && variantIds.includes(raw)) return raw
    return defaultId
  }, [searchParams, variantIds, defaultId])

  const index = variantIds.indexOf(variant)

  const setVariant = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams)
      next.set('variant', id)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const step = useCallback(
    (delta: number) => {
      const nextIndex = (index + delta + variantIds.length) % variantIds.length
      setVariant(variantIds[nextIndex]!)
    },
    [index, variantIds, setVariant],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        step(-1)
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        step(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  return { variant, variantIds, index, setVariant, step }
}
