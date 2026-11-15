import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { MagicLinkConfirmScreen } from '@/screens/MagicLinkConfirmScreen'

const server = setupServer(
  http.post('/api/v1/magic-links/inspect', () =>
    HttpResponse.json({ email: 'scout@example.com' }),
  ),
  http.post('/api/v1/magic-links/consume', () =>
    HttpResponse.json({
      user: { id: '1', email: 'scout@example.com', display_name: null },
    }),
  ),
)

function renderScreen(token = 'test-token') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/sign-in/confirm?token=${token}`]}>
        <Routes>
          <Route path="/sign-in/confirm" element={<MagicLinkConfirmScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('MagicLinkConfirmScreen', () => {
  it('shows the confirm prompt and signs in on button click', async () => {
    const user = userEvent.setup()
    renderScreen()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign in as/i })).toBeInTheDocument()
      expect(screen.getByText('scout@example.com')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(screen.getByText(/signed in/i)).toBeInTheDocument()
    })
  })
})