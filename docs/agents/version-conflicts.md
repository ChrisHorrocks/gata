# Per-row version conflicts (ADR 2)

This pattern ships with **#16 (trips)**. Later tickets for days, camps, gear items, and meals should copy it.

## Backend

1. Add a `version` column and SQLAlchemy `version_id_col` on the model (`app/models/trip.py` is the reference).
2. Include `version` on read responses. Writes accept `version` in the JSON body.
3. Before applying a `PATCH` or `DELETE`, call `assert_version_matches` from `app/versioning.py` with the row the client last saw.
4. On mismatch, the helper raises **409** with body:
   ```json
   { "detail": { "message": "Version conflict", "current": { ...row... } } }
   ```
5. Trip membership checks live in `app/trips_access.py` (404 when not on the trip so ids cannot be probed).

## Frontend

1. Keep the row `version` in form/query state and send it on every mutating request (`frontend/src/api/trips.ts`).
2. Use `isVersionConflict` / `currentFromConflict` from `frontend/src/lib/versionConflict.ts` in mutation `onError` handlers.
3. Show `VersionConflictDialog`; **Reload** applies `detail.current` to local state (see `TripSettingsScreen`).
4. Destructive confirms and conflict reloads use native `<dialog showModal()>` (`ConfirmDialog`, `VersionConflictDialog`), not Radix Dialog.

## Tests

- API: stale version → 409 with `current` row; permissions and 404 probing (`backend/tests/test_trips_api.py`).
- Screens: MSW stubs returning 409 and assert the reload affordance (`TripSettingsScreen.test.tsx`).