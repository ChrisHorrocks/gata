export const KIT_VARIANTS = [
  { id: 'member-tabs', label: 'Member tabs + pack bar', description: 'Tabs per member with a live pack weight bar; shared kit in a trip section.' },
  { id: 'shared-first', label: 'Shared kit first', description: 'Shared items and carriers dominate the top; personal gear library beneath.' },
  { id: 'load-board', label: 'Load board columns', description: 'Kanban-style columns for personal, shared, meals, and needs carrier.' },
] as const

export type KitVariantId = (typeof KIT_VARIANTS)[number]['id']
