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
  http.get('/api/v1/session', () => new HttpResponse(null, { status: 401 })),
)

function renderProtectedTrips() {
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

describe('protected trips route', () => {
  it('redirects signed-out visitors to sign-in', async () => {
    renderProtectedTrips()

    await waitFor(() => {
      expect(screen.getByText(/sign in to gata/i)).toBeInTheDocument()
    })
  })
})