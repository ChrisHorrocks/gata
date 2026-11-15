import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import type { GearItem } from '@/api/gear'
import { GearScreen } from '@/screens/GearScreen'

let gearItems: GearItem[] = []

function seedItem(partial: Partial<GearItem> & Pick<GearItem, 'name' | 'weight_grams'>): GearItem {
  return {
    id: partial.id ?? crypto.randomUUID(),
    category: partial.category ?? null,
    created_at: partial.created_at ?? new Date().toISOString(),
    ...partial,
  }
}

const server = setupServer(
  http.get('/api/v1/me/gear', () => HttpResponse.json(gearItems)),
  http.post('/api/v1/me/gear', async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      weight_grams: number
      category?: string | null
    }
    const created = seedItem({
      name: body.name,
      weight_grams: body.weight_grams,
      category: body.category ?? null,
    })
    gearItems = [...gearItems, created]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.patch('/api/v1/me/gear/:id', async ({ params, request }) => {
    const id = params.id as string
    const body = (await request.json()) as Partial<{
      name: string
      weight_grams: number
      category: string | null
    }>
    const index = gearItems.findIndex((item) => item.id === id)
    if (index < 0) {
      return new HttpResponse(null, { status: 404 })
    }
    gearItems[index] = { ...gearItems[index], ...body }
    return HttpResponse.json(gearItems[index])
  }),
  http.delete('/api/v1/me/gear/:id', ({ params }) => {
    const id = params.id as string
    gearItems = gearItems.filter((item) => item.id !== id)
    return new HttpResponse(null, { status: 204 })
  }),
)

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GearScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  gearItems = []
})
afterAll(() => server.close())

describe('GearScreen', () => {
  it('adds, edits and deletes items with totals and grouping', async () => {
    gearItems = [
      seedItem({ id: 'a', name: 'Sleeping bag', weight_grams: 900, category: 'Sleep' }),
      seedItem({ id: 'b', name: 'Tent', weight_grams: 2100, category: 'Shelter' }),
    ]
    const user = userEvent.setup()
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false
    })

    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('3,000 g')).toBeInTheDocument()
    })
    expect(screen.getByText('Sleep')).toBeInTheDocument()
    expect(screen.getByText('Shelter')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.type(screen.getByLabelText('Name'), 'Stove')
    await user.type(screen.getByLabelText(/Weight/i), '350')
    await user.type(screen.getByLabelText(/Category/i), 'Cooking')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => {
      expect(screen.getByText('Stove')).toBeInTheDocument()
    })
    expect(screen.getByText('3,350 g')).toBeInTheDocument()

    const stoveRow = screen.getByText('Stove').closest('li')
    assert(stoveRow)
    await user.click(within(stoveRow).getByRole('button', { name: 'Edit' }))
    const weightField = screen.getAllByLabelText(/Weight/i).at(-1)
    assert(weightField)
    await user.clear(weightField)
    await user.type(weightField, '320')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const stoveRow = screen.getByText('Stove').closest('li')
      assert(stoveRow)
      expect(within(stoveRow).getByText('320 g')).toBeInTheDocument()
    })

    const tentRow = screen.getByText('Tent').closest('li')
    assert(tentRow)
    await user.click(within(tentRow).getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: /^Delete$/ }),
    )

    await waitFor(() => {
      expect(screen.queryByText('Tent')).not.toBeInTheDocument()
    })
  })
})

function assert(value: unknown): asserts value {
  expect(value).toBeTruthy()
}