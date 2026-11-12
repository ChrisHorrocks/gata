# 2. Per-row version numbers for edit conflicts

Date: 2026-11-12. Status: accepted.

## Context
There will never be live collaborative editing. Several members may still edit the same trip at the same time.

## Decision
Each editable row (trip details, day, camp, trip gear item, meal) has its own version number. A save carries the version it was based on. If that version is out of date, the API rejects the save and the UI offers to reload.

## Consequences
Two people editing different rows never clash. Every write endpoint has to check the version, which also suits SQLAlchemy's `version_id_col`.
