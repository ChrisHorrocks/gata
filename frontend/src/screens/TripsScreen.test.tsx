import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/RequireAuth'
import { SignInScreen } from '@/screens/SignInScreen'
import { TripsScreen } from '@/screens/TripsScreen'

const server = setupServer(
  http.get('/api/v1/session', () =>
    HttpResponse.json({
      user: { id: 'u1', email: 'alice@example.com', display_name: null },
    }),
  ),
  http.get('/api/v1/trips', () =>
    HttpResponse.json({
      trips: [
        {
          id: 'trip-1',
          name: 'West Highland Way',
          start_date: '2026-05-01',
          emergency_notes: null,
          version: 1,
          role: 'organiser',
        },
      ],
    }),
  ),
)

function renderTrips() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trips']}>
        <Routes>
          <Route
            path="/trips"
            element={
              <RequireAuth>
                <TripsScreen />
              </RequireAuth>
            }
          />
          <Route path="/sign-in" element={<SignInScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('TripsScreen', () => {
  it('redirects signed-out visitors to sign-in', async () => {
    server.use(http.get('/api/v1/session', () => new HttpResponse(null, { status: 401 })))
    renderTrips()
    await waitFor(() => {
      expect(screen.getByText(/sign in to gata/i)).toBeInTheDocument()
    })
  })

  it('lists trips for signed-in users', async () => {
    renderTrips()
    await waitFor(() => {
      expect(screen.getByText('West Highland Way')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /new trip/i })).toHaveAttribute('href', '/trips/new')
  })
})