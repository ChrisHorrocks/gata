import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { HealthScreen } from '@/screens/HealthScreen'

const server = setupServer(
  http.get('/api/v1/health', () =>
    HttpResponse.json({ status: 'ok', database: 'connected' }),
  ),
)

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <HealthScreen />
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('HealthScreen', () => {
  it('renders the whole screen with health data from the API', async () => {
    renderScreen()

    expect(screen.getByText('gata')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('connected')).toBeInTheDocument()
    })
    expect(screen.getByText('ok')).toBeInTheDocument()
  })
})