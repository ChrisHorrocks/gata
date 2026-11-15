import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiRequest, csrfCookieNameForTests, csrfHeaderNameForTests } from '@/api/client'

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = `${csrfCookieNameForTests}=; Max-Age=0; path=/`
  })

  it('attaches the CSRF header on state-changing requests when the cookie is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    document.cookie = `${csrfCookieNameForTests}=abc123; path=/; secure`

    await apiRequest('/api/v1/session/logout', { method: 'POST' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/session/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          [csrfHeaderNameForTests]: 'abc123',
        }),
      }),
    )
  })

  it('does not attach CSRF on GET requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    document.cookie = `${csrfCookieNameForTests}=abc123; path=/; secure`

    await apiRequest('/api/v1/session')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/session',
      expect.objectContaining({
        method: 'GET',
        headers: undefined,
      }),
    )
  })
})