import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/RequireAuth'
import { ProfileScreen } from '@/screens/ProfileScreen'

const sessionUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'hiker@example.com',
  display_name: 'Trail Name',
}

let meBody = {
  id: sessionUser.id,
  email: sessionUser.email,
  display_name: 'Trail Name',
  emergency_contacts: [] as { name: string; relationship: string; phone: string }[],
}

let lastPatch: unknown = null

const server = setupServer(
  http.get('/api/v1/session', () =>
    HttpResponse.json({ user: sessionUser }),
  ),
  http.get('/api/v1/me', () => HttpResponse.json(meBody)),
  http.patch('/api/v1/me', async ({ request }) => {
    lastPatch = await request.json()
    const body = lastPatch as typeof meBody
    meBody = { ...meBody, ...body }
    sessionUser.display_name = meBody.display_name
    return HttpResponse.json(meBody)
  }),
)

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfileScreen />
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
  server.resetHandlers()
  lastPatch = null
  meBody = {
    id: sessionUser.id,
    email: sessionUser.email,
    display_name: 'Trail Name',
    emergency_contacts: [],
  }
  sessionUser.display_name = 'Trail Name'
})
afterAll(() => server.close())

describe('ProfileScreen', () => {
  it('edits display name and emergency contact then saves', async () => {
    const user = userEvent.setup()
    renderProfile()

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue('Trail Name')
    })

    const displayName = screen.getByLabelText(/display name/i)
    await user.clear(displayName)
    await user.type(displayName, 'Summit Sue')

    await user.type(screen.getByLabelText(/^name$/i), 'Alex Contact')
    await user.type(screen.getByLabelText(/relationship/i), 'Sibling')
    await user.type(screen.getByLabelText(/^phone$/i), '07700900123')

    await user.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(screen.getByText(/profile saved/i)).toBeInTheDocument()
    })

    expect(lastPatch).toEqual({
      display_name: 'Summit Sue',
      emergency_contacts: [
        {
          name: 'Alex Contact',
          relationship: 'Sibling',
          phone: '07700900123',
        },
      ],
    })
  })
})