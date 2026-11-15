import { ApiError } from '@/api/client'
import type { Trip } from '@/api/trips'

export type VersionConflictBody = {
  detail: {
    message: string
    current: Trip
  }
}

export function isVersionConflict(error: unknown): error is ApiError & { body: VersionConflictBody } {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return false
  }
  const body = error.body as VersionConflictBody | null
  return Boolean(body?.detail?.current && body.detail.message)
}

export function currentFromConflict(error: ApiError & { body: VersionConflictBody }): Trip {
  return error.body.detail.current
}