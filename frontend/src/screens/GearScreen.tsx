import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  createGearItem,
  deleteGearItem,
  fetchGear,
  type GearItem,
  updateGearItem,
} from '@/api/gear'
import { AppShell } from '@/components/AppShell'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const UNCATEGORIZED = 'Uncategorized'

function categoryLabel(item: GearItem): string {
  const trimmed = item.category?.trim()
  return trimmed ? trimmed : UNCATEGORIZED
}

function groupByCategory(items: GearItem[]): { label: string; items: GearItem[] }[] {
  const map = new Map<string, GearItem[]>()
  for (const item of items) {
    const label = categoryLabel(item)
    const bucket = map.get(label)
    if (bucket) {
      bucket.push(item)
    } else {
      map.set(label, [item])
    }
  }
  const labels = [...map.keys()].sort((a, b) => {
    if (a === UNCATEGORIZED) return 1
    if (b === UNCATEGORIZED) return -1
    return a.localeCompare(b)
  })
  return labels.map((label) => ({
    label,
    items: (map.get(label) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }))
}

function formatGrams(grams: number): string {
  return `${grams.toLocaleString()} g`
}

type ItemFormProps = {
  initial?: { name: string; weight_grams: string; category: string }
  submitLabel: string
  pending: boolean
  onSubmit: (values: { name: string; weight_grams: number; category: string | null }) => void
  onCancel?: () => void
}

function GearItemForm({ initial, submitLabel, pending, onSubmit, onCancel }: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [weight, setWeight] = useState(initial?.weight_grams ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [weightError, setWeightError] = useState<string | null>(null)

  const weightDescribedBy = weightError ? 'gear-weight-error' : undefined

  return (
    <form
      className="space-y-3 rounded-md border border-border p-3"
      onSubmit={(event) => {
        event.preventDefault()
        const parsed = Number.parseInt(weight, 10)
        if (!Number.isFinite(parsed) || parsed < 0) {
          setWeightError('Enter a whole number of grams, zero or more.')
          return
        }
        setWeightError(null)
        if (!name.trim()) {
          return
        }
        onSubmit({
          name: name.trim(),
          weight_grams: parsed,
          category: category.trim() === '' ? null : category.trim(),
        })
      }}
    >
      <div>
        <label className="block text-sm font-medium" htmlFor="gear-name">
          Name
        </label>
        <input
          id="gear-name"
          name="name"
          required
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm user-invalid:border-destructive"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={name.length > 0 && !name.trim() ? true : undefined}
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="gear-weight">
          Weight (g)
        </label>
        <input
          id="gear-weight"
          name="weight_grams"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm user-invalid:border-destructive"
          value={weight}
          onChange={(event) => {
            setWeight(event.target.value)
            setWeightError(null)
          }}
          aria-invalid={weightError ? true : undefined}
          aria-describedby={weightDescribedBy}
        />
        {weightError && (
          <p id="gear-weight-error" className="mt-1 text-sm text-destructive" role="alert">
            {weightError}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="gear-category">
          Category <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="gear-category"
          name="category"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

type DeleteTarget = { id: string; name: string }

export function GearScreen() {
  const queryClient = useQueryClient()
  const gearQuery = useQuery({ queryKey: ['gear'], queryFn: fetchGear })
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const createMutation = useMutation({
    mutationFn: createGearItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gear'] })
      setAdding(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateGearItem>[1] }) =>
      updateGearItem(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gear'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGearItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gear'] })
      setDeleteTarget(null)
    },
  })

  const items = useMemo(() => gearQuery.data ?? [], [gearQuery.data])
  const groups = useMemo(() => groupByCategory(items), [items])
  const totalGrams = useMemo(
    () => items.reduce((sum, item) => sum + item.weight_grams, 0),
    [items],
  )

  return (
    <AppShell>
      <div className="mb-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Gear library</h1>
        <p className="text-sm text-muted-foreground">
          Reusable kit items follow you across trips.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total weight</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{formatGrams(totalGrams)}</p>
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? 'No items yet.'
              : `${items.length} item${items.length === 1 ? '' : 's'} in your library`}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <GearListStatus pending={gearQuery.isPending} error={gearQuery.isError} />
        {gearQuery.isSuccess && groups.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">Add your first item to get started.</p>
        )}

        {groups.map((group) => (
          <Card key={group.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{group.label}</CardTitle>
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatGrams(group.items.reduce((s, i) => s + i.weight_grams, 0))}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="divide-y divide-border">
                {group.items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                    {editingId === item.id ? (
                      <div className="w-full">
                        <GearItemForm
                          initial={{
                            name: item.name,
                            weight_grams: String(item.weight_grams),
                            category: item.category ?? '',
                          }}
                          submitLabel="Save changes"
                          pending={updateMutation.isPending}
                          onCancel={() => setEditingId(null)}
                          onSubmit={(values) =>
                            updateMutation.mutate({ id: item.id, body: values })
                          }
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground tabular-nums">
                            {formatGrams(item.weight_grams)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAdding(false)
                              setEditingId(item.id)
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      {adding ? (
        <GearItemForm
          submitLabel="Add item"
          pending={createMutation.isPending}
          onCancel={() => setAdding(false)}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      ) : (
        <Button type="button" onClick={() => setAdding(true)}>
          Add item
        </Button>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete item?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from your gear library. Trip copies are not changed.`
            : ''
        }
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  )
}

function GearListStatus({
  pending,
  error,
}: {
  pending: boolean
  error: boolean
}) {
  if (pending) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading gear…
      </p>
    )
  }
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load your gear library.
      </p>
    )
  }
  return null
}