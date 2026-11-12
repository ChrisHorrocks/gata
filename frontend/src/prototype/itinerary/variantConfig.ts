export const ITINERARY_VARIANTS = [
  { id: 'map-split', label: 'Map-primary split', description: 'Large map left; day stack and stats on the right as primary edit surface.' },
  { id: 'timeline', label: 'Vertical timeline', description: 'Scrollable day timeline leads; map floats in a sticky side panel.' },
  { id: 'table-strip', label: 'Table + map strip', description: 'Dense editable day table is primary; map is a horizontal strip below.' },
] as const

export type ItineraryVariantId = (typeof ITINERARY_VARIANTS)[number]['id']
