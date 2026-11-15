import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import { RequireAuth } from '@/components/RequireAuth'
import { CreateTripScreen } from '@/screens/CreateTripScreen'

const server = setupServer(
  http.get('/api/v1/session', () =>
    HttpResponse.json({
      user: { id: 'u1', email: 'alice@example.com', display_name: null },
    }),
  ),
  http.post('/api/v1/trips', async ({ request }) => {
    const body = (await request.json()) as { name: string; start_date: string }
    return HttpResponse.json(
      {
        id: 'new-trip',
        name: body.name,
        start_date: body.start_date,
        emergency_notes: null,
        version: 1,
        role: 'organiser',
      },
      { status: 201 },
    )
  }),
)

function renderCreate() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      {
        path: '/trips/new',
        element: (
          <RequireAuth>
            <CreateTripScreen />
          </RequireAuth>
        ),
      },
      {
        path: '/trips/:tripId/settings',
        element: <div>Trip settings landing</div>,
      },
    ],
    { initialEntries: ['/trips/new'] },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('CreateTripScreen', () => {
  it('creates a trip and navigates to settings', async () => {
    const user = userEvent.setup()
    renderCreate()

    await waitFor(() => {
      expect(screen.getByLabelText(/trip name/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/trip name/i), 'Skye 2026')
    await user.type(screen.getByLabelText(/start date/i), '2026-07-01')
    await user.click(screen.getByRole('button', { name: /create trip/i }))

    await waitFor(() => {
      expect(screen.getByText('Trip settings landing')).toBeInTheDocument()
    })
  })
})