import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Member } from '../types'

export function CarrierPicker({
  members,
  value,
  onChange,
  placeholder = 'Carrier',
}: {
  members: Member[]
  value: string | null
  onChange: (memberId: string | null) => void
  placeholder?: string
}) {
  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? null : v)}
    >
      <SelectTrigger className="h-8 w-[9rem]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Needs carrier</SelectItem>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
