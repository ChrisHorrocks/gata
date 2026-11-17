import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'

import { createCamp, fetchCamps, patchCamp, type Camp, type CampListResponse } from '@/api/camps'
import {
  createDay,
  deleteDay,
  fetchDays,
  patchDay,
  reorderDays,
  type Day,
  type DayKind,
  type DayListResponse,
} from '@/api/days'
import { CampPositionDisplay } from '@/components/CampPositionDisplay'
import { ItineraryMap } from '@/components/ItineraryMap'
import { fetchTrip } from '@/api/trips'
import { AppShell } from '@/components/AppShell'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { VersionConflictDialog } from '@/components/VersionConflictDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/api/client'
import {
  campByDayId,
  effectiveCampForDay,
  orderedCampPins,
} from '@/lib/campItinerary'
import { parseCampPositionInput } from '@/lib/campPosition'
import { isVersionConflict } from '@/lib/versionConflict'
import type { Camp as CampRow } from '@/api/camps'

type RowDraft = {
  kind: DayKind
  distanceKm: string
  ascentM: string
  descentM: string
  version: number
}

function rowFromDay(day: Day): RowDraft {
  return {
    kind: day.kind,
    distanceKm: day.distance_km ?? '',
    ascentM: day.ascent_m === null ? '' : String(day.ascent_m),
    descentM: day.descent_m === null ? '' : String(day.descent_m),
    version: day.version,
  }
}

function formatDistance(total: string): string {
  return `${Number.parseFloat(total).toLocaleString(undefined, { maximumFractionDigits: 2 })} km`
}

function parseNonNegativeDecimal(value: string): string | null {
  if (value.trim() === '') {
    return '0'
  }
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return String(parsed)
}

function parseNonNegativeInt(value: string): number | null {
  if (value.trim() === '') {
    return 0
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

type DayRowProps = {
  day: Day
  draft: RowDraft
  tripId: string
  index: number
  dayCount: number
  pending: boolean
  selected: boolean
  effectiveCamp: CampRow | null
  campNotes: string
  onSelect: () => void
  onDraftChange: (next: RowDraft) => void
  onCampNotesChange: (value: string) => void
  onSaveCampNotes: () => void
  campNotesPending: boolean
  onSaved: (dayId: string) => void
  onDeleted: () => void
  onReordered: (list: DayListResponse) => void
  onConflict: (error: unknown) => void
  campPositionInput: string
  onCampPositionInputChange: (value: string) => void
  onApplyCampPosition: () => void
  campPositionPending: boolean
  campPositionError: string | null
}

function DayRow({
  day,
  draft,
  tripId,
  index,
  dayCount,
  pending,
  selected,
  effectiveCamp,
  campNotes,
  onSelect,
  onDraftChange,
  onCampNotesChange,
  onSaveCampNotes,
  campNotesPending,
  onSaved,
  onDeleted,
  onReordered,
  onConflict,
  campPositionInput,
  onCampPositionInputChange,
  onApplyCampPosition,
  campPositionPending,
  campPositionError,
}: DayRowProps) {
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (draft.kind === 'rest') {
        return patchDay(tripId, day.id, { version: draft.version, kind: 'rest' })
      }
      const distance = parseNonNegativeDecimal(draft.distanceKm)
      const ascent = parseNonNegativeInt(draft.ascentM)
      const descent =
        draft.descentM.trim() === '' ? null : parseNonNegativeInt(draft.descentM)
      if (distance === null || ascent === null || (draft.descentM.trim() !== '' && descent === null)) {
        throw new Error('invalid')
      }
      return patchDay(tripId, day.id, {
        version: draft.version,
        kind: 'walking',
        distance_km: distance,
        ascent_m: ascent,
        descent_m: descent,
      })
    },
    onSuccess: async (saved) => {
      setFieldError(null)
      onSaved(saved.id)
      await queryClient.invalidateQueries({ queryKey: ['days', tripId] })
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'invalid') {
        setFieldError('Distance and ascent must be zero or more.')
        return
      }
      if (isVersionConflict(error)) {
        onConflict(error)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => deleteDay(tripId, day.id, draft.version),
    onSuccess: async () => {
      setShowDelete(false)
      onDeleted()
      await queryClient.invalidateQueries({ queryKey: ['days', tripId] })
    },
    onError: (error) => {
      setShowDelete(false)
      if (isVersionConflict(error)) {
        onConflict(error)
      }
    },
  })

  const moveMutation = useMutation({
    mutationFn: async (direction: -1 | 1) => {
      const list = queryClient.getQueryData<DayListResponse>(['days', tripId])
      if (!list) {
        throw new Error('missing list')
      }
      const target = index + direction
      if (target < 0 || target >= list.days.length) {
        return list
      }
      const order = [...list.days]
      const [moved] = order.splice(index, 1)
      order.splice(target, 0, moved)
      return reorderDays(
        tripId,
        order.map((entry) => ({ id: entry.id, version: entry.version })),
      )
    },
    onSuccess: (list) => {
      if (list) {
        onReordered(list)
        queryClient.setQueryData(['days', tripId], list)
      }
    },
    onError: (error) => {
      if (isVersionConflict(error)) {
        onConflict(error)
      }
    },
  })

  const errorId = fieldError ? `day-${day.id}-error` : undefined
  const campPositionErrorId = campPositionError ? `day-${day.id}-camp-position-error` : undefined
  const dayLabel = `Day ${index + 1}`

  return (
    <>
      <article
        aria-labelledby={`day-${day.id}-heading`}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className={`cursor-pointer rounded-md border p-3 transition-colors ${
          selected
            ? 'border-primary bg-muted/40 ring-2 ring-primary/20'
            : 'border-border hover:bg-muted/20'
        }`}
      >
        <header id={`day-${day.id}-heading`} className="mb-3">
          <span className="block text-xs text-muted-foreground">{dayLabel}</span>
          <time className="font-medium" dateTime={day.date}>
            {day.date}
          </time>
        </header>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3" onClick={(event) => event.stopPropagation()}>
            <div className="min-w-[5.5rem] shrink-0">
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor={`kind-${day.id}`}>
                Type
              </label>
              <select
                id={`kind-${day.id}`}
                className="w-full min-w-[5.5rem] rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={draft.kind}
                onChange={(event) => {
                  const kind = event.target.value as DayKind
                  onDraftChange({
                    ...draft,
                    kind,
                    ...(kind === 'rest'
                      ? { distanceKm: '', ascentM: '', descentM: '' }
                      : {
                          distanceKm: draft.distanceKm || '0',
                          ascentM: draft.ascentM || '0',
                        }),
                  })
                  setFieldError(null)
                }}
              >
                <option value="walking">Walking</option>
                <option value="rest">Rest</option>
              </select>
            </div>
            {draft.kind === 'rest' ? (
              <p className="pb-1 text-sm text-muted-foreground">Rest day</p>
            ) : (
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                <div className="min-w-0">
                  <label
                    className="mb-1 block text-xs text-muted-foreground"
                    htmlFor={`distance-${day.id}`}
                  >
                    Distance (km)
                  </label>
                  <input
                    id={`distance-${day.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    className="w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm user-invalid:border-destructive"
                    value={draft.distanceKm}
                    onChange={(event) => {
                      onDraftChange({ ...draft, distanceKm: event.target.value })
                      setFieldError(null)
                    }}
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={errorId}
                  />
                </div>
                <div className="min-w-0">
                  <label
                    className="mb-1 block text-xs text-muted-foreground"
                    htmlFor={`ascent-${day.id}`}
                  >
                    Ascent (m)
                  </label>
                  <input
                    id={`ascent-${day.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    className="w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm user-invalid:border-destructive"
                    value={draft.ascentM}
                    onChange={(event) => {
                      onDraftChange({ ...draft, ascentM: event.target.value })
                      setFieldError(null)
                    }}
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={errorId}
                  />
                </div>
                <div className="min-w-0">
                  <label
                    className="mb-1 block text-xs text-muted-foreground"
                    htmlFor={`descent-${day.id}`}
                  >
                    Descent (m)
                  </label>
                  <input
                    id={`descent-${day.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    className="w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    value={draft.descentM}
                    onChange={(event) => {
                      onDraftChange({ ...draft, descentM: event.target.value })
                      setFieldError(null)
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {effectiveCamp && (
            <div className="rounded-md border border-border/60 bg-muted/20 p-2" onClick={(event) => event.stopPropagation()}>
              <CampPositionDisplay latitude={effectiveCamp.latitude} longitude={effectiveCamp.longitude} />
            </div>
          )}

          {selected && (
            <div
              className="space-y-2 rounded-md border border-border bg-card/80 p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs text-muted-foreground">
                {day.kind === 'walking'
                  ? effectiveCamp
                    ? `Camp pin ${effectiveCamp.pin_number} · ${effectiveCamp.name}`
                    : 'Click the map to place tonight’s camp.'
                  : effectiveCamp
                    ? `Stays at camp pin ${effectiveCamp.pin_number} (${effectiveCamp.name}).`
                    : 'No camp yet from a previous walking day.'}
              </p>
              {day.kind === 'walking' && (
                <>
                  <label
                    className="block text-xs text-muted-foreground"
                    htmlFor={`camp-position-${day.id}`}
                  >
                    Grid reference or lat, long
                  </label>
                  <div className="flex flex-wrap items-start gap-2">
                    <input
                      id={`camp-position-${day.id}`}
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm user-invalid:border-destructive"
                      value={campPositionInput}
                      onChange={(event) => onCampPositionInputChange(event.target.value)}
                      aria-invalid={campPositionError ? true : undefined}
                      aria-describedby={campPositionErrorId}
                      placeholder="e.g. TG 5140 1317 or 52.658, 1.716"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={campPositionPending}
                      onClick={() => onApplyCampPosition()}
                    >
                      Set position
                    </Button>
                  </div>
                  {campPositionError && (
                    <p id={campPositionErrorId} className="text-sm text-destructive" role="alert">
                      {campPositionError}
                    </p>
                  )}
                </>
              )}
              {day.kind === 'walking' && effectiveCamp && (
                <>
                  <label className="block text-xs text-muted-foreground" htmlFor={`camp-notes-${day.id}`}>
                    Camp notes
                  </label>
                  <textarea
                    id={`camp-notes-${day.id}`}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    value={campNotes}
                    onChange={(event) => onCampNotesChange(event.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={campNotesPending}
                    onClick={() => onSaveCampNotes()}
                  >
                    Save camp notes
                  </Button>
                </>
              )}
            </div>
          )}

          <div
            role="group"
            aria-label={`Actions for ${dayLabel.toLowerCase()}`}
            className="flex flex-wrap items-center gap-2 border-t border-border pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              size="sm"
              disabled={pending || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save
            </Button>
            <div role="group" aria-label={`Reorder ${dayLabel.toLowerCase()}`} className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={index === 0 || moveMutation.isPending}
                onClick={() => moveMutation.mutate(-1)}
                aria-label={`Move day ${index + 1} up`}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={index >= dayCount - 1 || moveMutation.isPending}
                onClick={() => moveMutation.mutate(1)}
                aria-label={`Move day ${index + 1} down`}
              >
                ↓
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => setShowDelete(true)}
            >
              Delete
            </Button>
          </div>
          {fieldError && (
            <p id={errorId} className="text-sm text-destructive" role="alert">
              {fieldError}
            </p>
          )}
        </div>
      </article>
      {showDelete &&
        createPortal(
          <ConfirmDialog
            open={showDelete}
            title="Delete this day?"
            description="This removes the day from the itinerary. Other days will move up."
            confirmLabel="Delete day"
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDelete(false)}
          />,
          document.body,
        )}
    </>
  )
}

export function ItineraryScreen() {
  const { tripId = '' } = useParams()
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({})
  const [campNoteDrafts, setCampNoteDrafts] = useState<Record<string, string>>({})
  const [campPositionDrafts, setCampPositionDrafts] = useState<Record<string, string>>({})
  const [campPositionErrors, setCampPositionErrors] = useState<Record<string, string>>({})
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [flyToToken, setFlyToToken] = useState(0)
  const [showConflict, setShowConflict] = useState(false)
  const [conflictError, setConflictError] = useState<ApiError | null>(null)
  const [conflictResourceLabel, setConflictResourceLabel] = useState('itinerary')

  const tripQuery = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTrip(tripId),
    enabled: tripId.length > 0,
  })

  const daysQuery = useQuery({
    queryKey: ['days', tripId],
    queryFn: () => fetchDays(tripId),
    enabled: tripId.length > 0,
  })

  const campsQuery = useQuery({
    queryKey: ['camps', tripId],
    queryFn: () => fetchCamps(tripId),
    enabled: tripId.length > 0,
  })

  const pins = useMemo(
    () => orderedCampPins(daysQuery.data?.days ?? [], campsQuery.data?.camps ?? []),
    [campsQuery.data?.camps, daysQuery.data?.days],
  )
  const days = daysQuery.data?.days ?? []
  const camps = campsQuery.data?.camps ?? []

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? days[0] ?? null
  const flyTo = useMemo(() => {
    if (!selectedDay) {
      return null
    }
    const camp = effectiveCampForDay(days, camps, selectedDay.id)
    if (!camp) {
      return null
    }
    return {
      latitude: camp.latitude,
      longitude: camp.longitude,
      token: flyToToken,
    }
  }, [camps, days, flyToToken, selectedDay])

  const clearDraft = useCallback((dayId: string) => {
    setDrafts((previous) => {
      if (!(dayId in previous)) {
        return previous
      }
      const next = { ...previous }
      delete next[dayId]
      return next
    })
  }, [])

  const applyList = useCallback(
    (list: DayListResponse) => {
      queryClient.setQueryData(['days', tripId], list)
      setDrafts({})
    },
    [queryClient, tripId],
  )

  const addMutation = useMutation({
    mutationFn: async (kind: DayKind) => createDay(tripId, { kind }),
    onSuccess: async () => {
      await daysQuery.refetch()
    },
  })

  const handleConflict = useCallback((error: unknown, resourceLabel: 'itinerary' | 'camp') => {
    setConflictResourceLabel(resourceLabel)
    if (error instanceof ApiError) {
      setConflictError(error)
    }
    setShowConflict(true)
  }, [])

  const placeCampMutation = useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) => {
      if (!selectedDay || selectedDay.kind !== 'walking') {
        throw new Error('no-walking-day')
      }
      const existing = campByDayId(camps).get(selectedDay.id)
      if (existing) {
        return patchCamp(tripId, existing.id, {
          version: existing.version,
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
      }
      let walkingPin = 0
      for (const day of days) {
        if (day.kind === 'walking') {
          walkingPin += 1
        }
        if (day.id === selectedDay.id) {
          break
        }
      }
      return createCamp(tripId, {
        day_id: selectedDay.id,
        name: `Camp ${walkingPin}`,
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
    },
    onSuccess: async () => {
      await campsQuery.refetch()
    },
    onError: (error) => {
      if (isVersionConflict(error)) {
        handleConflict(error, 'camp')
      }
    },
  })

  const submitCampPosition = (dayId: string, rawInput: string) => {
    try {
      const position = parseCampPositionInput(rawInput)
      setCampPositionErrors((previous) => {
        const next = { ...previous }
        delete next[dayId]
        return next
      })
      placeCampMutation.mutate({
        latitude: position.latitude,
        longitude: position.longitude,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid position.'
      setCampPositionErrors((previous) => ({ ...previous, [dayId]: message }))
    }
  }

  const campNotesMutation = useMutation({
    mutationFn: async ({ camp, notes }: { camp: Camp; notes: string }) =>
      patchCamp(tripId, camp.id, { version: camp.version, notes: notes.trim() === '' ? null : notes }),
    onSuccess: async (saved) => {
      setCampNoteDrafts((previous) => {
        const next = { ...previous }
        delete next[saved.day_id]
        return next
      })
      await campsQuery.refetch()
    },
    onError: (error) => {
      if (isVersionConflict(error)) {
        handleConflict(error, 'camp')
      }
    },
  })

  const reloadFromServer = async () => {
    setShowConflict(false)
    const error = conflictError
    setConflictError(null)
    if (error?.body && typeof error.body === 'object' && error.body !== null) {
      const detail = (error.body as { detail?: { current?: DayListResponse | Day | Camp | CampListResponse } })
        .detail
      const current = detail?.current
      if (current && 'days' in current) {
        applyList(current)
        return
      }
      if (current && 'camps' in current) {
        queryClient.setQueryData(['camps', tripId], current)
        setCampNoteDrafts({})
        return
      }
      if (current && 'day_id' in current) {
        const camp = current as Camp
        queryClient.setQueryData(['camps', tripId], (previous: CampListResponse | undefined) => {
          if (!previous) {
            return { camps: [camp] }
          }
          const rows = previous.camps.some((row) => row.id === camp.id)
            ? previous.camps.map((row) => (row.id === camp.id ? camp : row))
            : [...previous.camps, camp]
          return { camps: rows }
        })
        setCampNoteDrafts({})
        return
      }
    }
    setDrafts({})
    setCampNoteDrafts({})
    await Promise.all([daysQuery.refetch(), campsQuery.refetch()])
  }

  const pending = addMutation.isPending

  return (
    <AppShell layout="wide">
      <Card className="mb-4">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{tripQuery.data?.name ?? 'Itinerary'}</CardTitle>
          <div className="flex flex-wrap gap-2 text-sm">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={`/trips/${tripId}/settings`}>Trip settings</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(tripQuery.isError || daysQuery.isError) && (
            <p role="alert" className="text-sm text-destructive">
              Could not load this trip.
            </p>
          )}
          {(tripQuery.isPending || daysQuery.isPending) && (
            <p className="text-sm text-muted-foreground" role="status">
              Loading itinerary…
            </p>
          )}
          {tripQuery.isSuccess && daysQuery.isSuccess && (
            <p className="text-sm font-medium" role="status">
              Trip totals: {formatDistance(daysQuery.data.total_distance_km)} ·{' '}
              {daysQuery.data.total_ascent_m.toLocaleString()} m ascent
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid min-h-0 gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-stretch">
        <section
          aria-label="Itinerary map pane"
          className="relative min-h-72 overflow-hidden rounded-lg border border-border bg-card md:min-h-[32rem]"
        >
          <div className="flex h-full min-h-0 flex-col p-2">
            <p className="mb-2 shrink-0 text-xs text-muted-foreground">
              {selectedDay?.kind === 'walking'
                ? 'Click the map to place or move the selected day’s camp.'
                : 'Select a walking day to place a camp. Rest days stay at the previous camp.'}
            </p>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border">
              <ItineraryMap
                pins={pins}
                flyTo={flyTo}
                onMapClick={(coords) => {
                  if (selectedDay?.kind === 'walking') {
                    placeCampMutation.mutate(coords)
                  }
                }}
              />
            </div>
          </div>
        </section>

        <section aria-label="Itinerary days" className="min-h-0 min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => addMutation.mutate('walking')}
            >
              Add walking day
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => addMutation.mutate('rest')}
            >
              Add rest day
            </Button>
          </div>

          {daysQuery.isSuccess && daysQuery.data.days.length === 0 && (
            <p className="text-sm text-muted-foreground">No days yet. Add a walking or rest day.</p>
          )}

          {daysQuery.isSuccess && daysQuery.data.days.length > 0 && (
            <ul className="flex list-none flex-col gap-3 p-0 motion-safe:transition-[transform] motion-reduce:transition-none">
              {daysQuery.data.days.map((day, index) => {
                const draft = drafts[day.id] ?? rowFromDay(day)
                const effectiveCamp = effectiveCampForDay(daysQuery.data.days, camps, day.id)
                const selected = (selectedDay?.id ?? daysQuery.data.days[0]?.id) === day.id
                const campNotes = campNoteDrafts[day.id] ?? effectiveCamp?.notes ?? ''
                return (
                  <li key={day.id}>
                    <DayRow
                      day={day}
                      draft={draft}
                      tripId={tripId}
                      index={index}
                      dayCount={daysQuery.data.days.length}
                      pending={pending}
                      selected={selected}
                      effectiveCamp={effectiveCamp}
                      campNotes={campNotes}
                      campNotesPending={campNotesMutation.isPending}
                      onSelect={() => {
                        setSelectedDayId(day.id)
                        setFlyToToken((value) => value + 1)
                      }}
                      onCampNotesChange={(value) =>
                        setCampNoteDrafts((previous) => ({ ...previous, [day.id]: value }))
                      }
                      onSaveCampNotes={() => {
                        const camp = campByDayId(camps).get(day.id)
                        if (!camp) {
                          return
                        }
                        campNotesMutation.mutate({ camp, notes: campNotes })
                      }}
                      onDraftChange={(next) =>
                        setDrafts((previous) => ({ ...previous, [day.id]: next }))
                      }
                      onSaved={clearDraft}
                      onDeleted={() => clearDraft(day.id)}
                      onReordered={applyList}
                      onConflict={(error) => handleConflict(error, 'itinerary')}
                      campPositionInput={campPositionDrafts[day.id] ?? ''}
                      onCampPositionInputChange={(value) => {
                        setCampPositionDrafts((previous) => ({ ...previous, [day.id]: value }))
                        setCampPositionErrors((previous) => {
                          if (!(day.id in previous)) {
                            return previous
                          }
                          const next = { ...previous }
                          delete next[day.id]
                          return next
                        })
                      }}
                      onApplyCampPosition={() => submitCampPosition(day.id, campPositionDrafts[day.id] ?? '')}
                      campPositionPending={placeCampMutation.isPending}
                      campPositionError={campPositionErrors[day.id] ?? null}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <VersionConflictDialog
        open={showConflict}
        resourceLabel={conflictResourceLabel}
        onReload={() => {
          void reloadFromServer()
        }}
        onDismiss={() => setShowConflict(false)}
      />
    </AppShell>
  )
}