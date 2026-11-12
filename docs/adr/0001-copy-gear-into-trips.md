# 1. Copy gear library items into trips

Date: 2026-11-12. Status: accepted.

## Context
Members keep a reusable gear library. Trips need item names and weights, and old trip sheets should stay accurate.

## Decision
When an item is added to a trip, its name and weight are copied onto the trip gear item, and a link back to the library item is kept. Editing or deleting the library item never changes existing trips. A "refresh from library" action re-copies the item on request.

## Consequences
Weights on past trips stay fixed. If someone updates an item's weight in their library, it won't change on trips that already have it until they press refresh.
