import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { SignInScreen } from '@/screens/SignInScreen'

const server = setupServer(
  http.post('/api/v1/magic-links', async ({ request }) => {
    const body = (await request.json()) as { email: string }
    return HttpResponse.json({
      message: `If that address can sign in, we have sent a link. It expires in 15 minutes.`,
      echo: body.email,
    })
  }),
)

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SignInScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('SignInScreen', () => {
  it('requests a magic link from the sign-in screen', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.type(screen.getByLabelText(/email/i), 'walker@example.com')
    await user.click(screen.getByRole('button', { name: /email me a link/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/If that address can sign in, we have sent a link/i),
      ).toBeInTheDocument()
    })
  })
})