import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { CreateTripScreen } from '@/screens/CreateTripScreen'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const server = setupServer(
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
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateTripScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  navigateMock.mockReset()
})
afterAll(() => server.close())

describe('CreateTripScreen', () => {
  it('creates a trip and navigates to settings', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(screen.getByLabelText(/trip name/i), 'Skye 2026')
    await user.type(screen.getByLabelText(/start date/i), '2026-07-01')
    await user.click(screen.getByRole('button', { name: /create trip/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/trips/new-trip/settings', { replace: true })
    })
  })
})