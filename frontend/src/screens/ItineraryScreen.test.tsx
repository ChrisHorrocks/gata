import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/RequireAuth'
import { ItineraryScreen } from '@/screens/ItineraryScreen'

const trip = {
  id: 'trip-1',
  name: 'Cairngorms',
  start_date: '2026-06-01',
  emergency_notes: null,
  version: 1,
  role: 'organiser' as const,
}

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
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ItineraryScreen', () => {
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
    expect(screen.getByLabelText(/distance in km for day 1/i)).toHaveValue(10)

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(screen.getByText(/someone else saved first/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /reload/i }))
    await waitFor(() => {
      expect(screen.getByLabelText(/distance in km for day 1/i)).toHaveValue(11)
    })
  })
})