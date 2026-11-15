import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client'
import { currentFromConflict, isVersionConflict } from '@/lib/versionConflict'

describe('versionConflict', () => {
  it('detects 409 payloads with current row', () => {
    const error = new ApiError(409, {
      detail: {
        message: 'Version conflict',
        current: {
          id: 't1',
          name: 'Latest',
          start_date: '2026-06-01',
          emergency_notes: null,
          version: 2,
          role: 'organiser',
        },
      },
    })
    expect(isVersionConflict(error)).toBe(true)
    if (!isVersionConflict(error)) {
      throw new Error('expected version conflict')
    }
    expect(currentFromConflict(error).name).toBe('Latest')
  })

  it('rejects other errors', () => {
    expect(isVersionConflict(new ApiError(404, { detail: 'missing' }))).toBe(false)
  })
})