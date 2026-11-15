import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/RequireAuth'
import { TripSettingsScreen } from '@/screens/TripSettingsScreen'

const trip = {
  id: 'trip-1',
  name: 'Cairngorms',
  start_date: '2026-06-01',
  emergency_notes: 'Back Sunday',
  version: 1,
  role: 'organiser' as const,
}

const server = setupServer(
  http.get('/api/v1/session', () =>
    HttpResponse.json({
      user: { id: 'u1', email: 'alice@example.com', display_name: null },
    }),
  ),
  http.get('/api/v1/trips/trip-1', () => HttpResponse.json(trip)),
)

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trips/trip-1/settings']}>
        <Routes>
          <Route
            path="/trips/:tripId/settings"
            element={
              <RequireAuth>
                <TripSettingsScreen />
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

describe('TripSettingsScreen', () => {
  it('shows version conflict reload option', async () => {
    const user = userEvent.setup()
    server.use(
      http.patch('/api/v1/trips/trip-1', () =>
        HttpResponse.json(
          {
            detail: {
              message: 'Version conflict',
              current: { ...trip, name: 'Updated elsewhere', version: 2 },
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderSettings()
    await waitFor(() => {
      expect(screen.getByDisplayValue('Cairngorms')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText(/someone else saved first/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
  })

  it('opens delete confirmation for organiser', async () => {
    const user = userEvent.setup()
    renderSettings()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete trip/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /delete trip/i }))
    expect(screen.getByRole('heading', { name: /delete this trip/i })).toBeInTheDocument()
  })
})