import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/RequireAuth'
import { ItineraryScreen } from '@/screens/ItineraryScreen'

vi.mock('@/components/ItineraryMap', () => ({
  ItineraryMap: ({
    onMapClick,
  }: {
    onMapClick: (coords: { latitude: number; longitude: number }) => void
  }) => (
    <button
      type="button"
      aria-label="Trip map"
      onClick={() => onMapClick({ latitude: 53.1, longitude: -4.1 })}
    >
      Map stub
    </button>
  ),
}))

const trip = {
  id: 'trip-1',
  name: 'Cairngorms',
  start_date: '2026-06-01',
  emergency_notes: null,
  version: 1,
  role: 'organiser' as const,
}

const campList = { camps: [] as Array<Record<string, unknown>> }

const dayList = {
  days: [
    {
      id: 'day-1',
      position: 0,
      kind: 'walking' as const,
      date: '2026-06-01',
      distance_km: '10.00',
      ascent_m: 400,
      descent_m: null,
      version: 1,
    },
  ],
  total_distance_km: '10.00',
  total_ascent_m: 400,
}

const server = setupServer(
  http.get('/api/v1/session', () =>
    HttpResponse.json({
      user: { id: 'u1', email: 'alice@example.com', display_name: null },
    }),
  ),
  http.get('/api/v1/trips/trip-1', () => HttpResponse.json(trip)),
  http.get('/api/v1/trips/trip-1/days', () => HttpResponse.json(dayList)),
  http.get('/api/v1/trips/trip-1/camps', () => HttpResponse.json(campList)),
)

function renderItinerary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trips/trip-1/itinerary']}>
        <Routes>
          <Route
            path="/trips/:tripId/itinerary"
            element={
              <RequireAuth>
                <ItineraryScreen />
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  campList.camps = []
})
afterAll(() => server.close())

describe('ItineraryScreen', () => {
  it('places a camp and saves camp notes', async () => {
    const user = userEvent.setup()
    const placed = {
      id: 'camp-1',
      day_id: 'day-1',
      name: 'Camp 1',
      latitude: 53.1,
      longitude: -4.1,
      notes: null,
      version: 1,
      pin_number: 1,
    }
    const requests: Array<{ method: string; body: unknown }> = []
    server.use(
      http.post('/api/v1/trips/trip-1/camps', async ({ request }) => {
        const body = await request.json()
        requests.push({ method: 'POST', body })
        campList.camps = [placed]
        return HttpResponse.json(placed, { status: 201 })
      }),
      http.patch('/api/v1/trips/trip-1/camps/camp-1', async ({ request }) => {
        const body = (await request.json()) as { notes: string; version: number }
        requests.push({ method: 'PATCH', body })
        const saved = { ...placed, notes: body.notes, version: 2 }
        campList.camps = [saved]
        return HttpResponse.json(saved)
      }),
    )

    renderItinerary()
    await waitFor(() => {
      expect(screen.getByLabelText('Trip map')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Trip map' }))
    await waitFor(() => {
      expect(requests.some((entry) => entry.method === 'POST')).toBe(true)
    })
    const postBody = requests.find((entry) => entry.method === 'POST')?.body as {
      day_id: string
      latitude: number
      longitude: number
    }
    expect(postBody.day_id).toBe('day-1')

    await user.type(screen.getByLabelText('Camp notes'), 'Windy col')
    await user.click(screen.getByRole('button', { name: /save camp notes/i }))
    await waitFor(() => {
      const patch = requests.find((entry) => entry.method === 'PATCH')?.body as { notes: string }
      expect(patch.notes).toBe('Windy col')
    })
  })

  it('shows day list, totals, and version conflict reload', async () => {
    const user = userEvent.setup()
    const refreshed = {
      ...dayList,
      days: [{ ...dayList.days[0], distance_km: '11.00', version: 2 }],
    }
    let list = dayList
    server.use(
      http.get('/api/v1/trips/trip-1/days', () => HttpResponse.json(list)),
      http.patch('/api/v1/trips/trip-1/days/day-1', () => {
        list = refreshed
        return HttpResponse.json(
          {
            detail: {
              message: 'Version conflict',
              current: refreshed.days[0],
            },
          },
          { status: 409 },
        )
      }),
    )

    renderItinerary()
    await waitFor(() => {
      expect(screen.getByText(/trip totals: 10 km/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/^distance \(km\)$/i)).toHaveValue(10)

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(screen.getByText(/someone else saved first/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /reload/i }))
    await waitFor(() => {
      expect(screen.getByLabelText(/^distance \(km\)$/i)).toHaveValue(11)
    })
  })
})