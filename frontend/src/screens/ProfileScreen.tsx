import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'

import { type EmergencyContact, type MeResponse, fetchMe, patchMe } from '@/api/me'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const EMPTY_CONTACT: EmergencyContact = { name: '', relationship: '', phone: '' }

function parseContacts(contacts: EmergencyContact[]): EmergencyContact[] {
  if (contacts.length === 0) {
    return [{ ...EMPTY_CONTACT }]
  }
  return contacts.map((contact) => ({ ...contact }))
}

export function ProfileScreen() {
  const meQuery = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          {meQuery.isPending && (
            <p className="text-sm text-muted-foreground" role="status">
              Loading profile…
            </p>
          )}
          {meQuery.isError && (
            <p className="text-sm text-destructive" role="alert">
              Could not load profile.
            </p>
          )}
          {meQuery.isSuccess && (
            <ProfileForm initial={meQuery.data} />
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}

function ProfileForm({ initial }: { initial: MeResponse }) {
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(initial.display_name ?? '')
  const [contacts, setContacts] = useState(() => parseContacts(initial.emergency_contacts))
  const [formError, setFormError] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)

  const displayNameId = useId()
  const displayNameErrorId = useId()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const root = formRef.current
    if (!root) {
      return
    }
    const syncField = (element: HTMLInputElement) => {
      const invalid = element.matches(':user-invalid')
      element.setAttribute('aria-invalid', invalid ? 'true' : 'false')
    }
    const onFieldEvent = (event: Event) => {
      const target = event.target
      if (target instanceof HTMLInputElement && target.classList.contains('field-input')) {
        syncField(target)
      }
    }
    root.querySelectorAll<HTMLInputElement>('.field-input').forEach((input) => {
      input.setAttribute('aria-invalid', 'false')
    })
    root.addEventListener('input', onFieldEvent)
    root.addEventListener('blur', onFieldEvent, true)
    root.addEventListener(
      'invalid',
      (event) => {
        const target = event.target
        if (target instanceof HTMLInputElement && target.classList.contains('field-input')) {
          target.setAttribute('aria-invalid', 'true')
        }
      },
      true,
    )
    return () => {
      root.removeEventListener('input', onFieldEvent)
      root.removeEventListener('blur', onFieldEvent, true)
    }
  }, [contacts.length])

  const saveMutation = useMutation({
    mutationFn: () => {
      const filled = contacts.filter(
        (contact) =>
          contact.name.trim() || contact.relationship.trim() || contact.phone.trim(),
      )
      return patchMe({
        display_name: displayName.trim() || null,
        emergency_contacts: filled.map((contact) => ({
          name: contact.name.trim(),
          relationship: contact.relationship.trim(),
          phone: contact.phone.trim(),
        })),
      })
    },
    onSuccess: async (data) => {
      setFormError(null)
      setShowSaved(true)
      queryClient.setQueryData(['me'], data)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
    onError: () => {
      setShowSaved(false)
      setFormError('Could not save. Check each contact has name, relationship, and phone.')
    },
  })

  const addSecondContact = () => {
    if (contacts.length >= 2) {
      return
    }
    setContacts([...contacts, { ...EMPTY_CONTACT }])
  }

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setShowSaved(false)
    setContacts(
      contacts.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)),
    )
  }

  return (
    <form
      ref={formRef}
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        setFormError(null)
        setShowSaved(false)
        saveMutation.mutate()
      }}
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor={displayNameId}>
          Display name
        </label>
        <input
          id={displayNameId}
          name="display_name"
          type="text"
          autoComplete="name"
          className="field-input w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={displayName}
          onChange={(event) => {
            setShowSaved(false)
            setDisplayName(event.target.value)
          }}
          aria-describedby={formError ? displayNameErrorId : undefined}
        />
      </div>

      <section className="space-y-4" aria-labelledby="emergency-contacts-heading">
        <h2 id="emergency-contacts-heading" className="text-sm font-medium">
          Emergency contacts
        </h2>
        <p className="text-sm text-muted-foreground">
          Add up to two contacts. They stay on your profile for every trip.
        </p>
        {contacts.map((contact, index) => (
          <EmergencyContactFields
            key={index}
            index={index}
            contact={contact}
            onChange={updateContact}
          />
        ))}
        {contacts.length < 2 && (
          <Button type="button" variant="outline" onClick={addSecondContact}>
            Add another contact
          </Button>
        )}
      </section>

      {formError && (
        <p id={displayNameErrorId} className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      {showSaved && !formError && (
        <p className="text-sm" role="status">
          Profile saved.
        </p>
      )}

      <Button type="submit" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}

type EmergencyContactFieldsProps = {
  index: number
  contact: EmergencyContact
  onChange: (index: number, field: keyof EmergencyContact, value: string) => void
}

function EmergencyContactFields({ index, contact, onChange }: EmergencyContactFieldsProps) {
  const base = useId()
  const nameId = `${base}-name`
  const relationshipId = `${base}-relationship`
  const phoneId = `${base}-phone`
  const legend = index === 0 ? 'Primary emergency contact' : 'Second emergency contact'

  return (
    <fieldset className="field-group space-y-3 rounded-md border border-border p-4">
      <legend className="px-1 text-sm font-medium">{legend}</legend>
      <div className="space-y-2">
        <label className="block text-sm" htmlFor={nameId}>
          Name
        </label>
        <input
          id={nameId}
          name={`contact_${index}_name`}
          type="text"
          autoComplete="name"
          className="field-input w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={contact.name}
          onChange={(event) => onChange(index, 'name', event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm" htmlFor={relationshipId}>
          Relationship
        </label>
        <input
          id={relationshipId}
          name={`contact_${index}_relationship`}
          type="text"
          autoComplete="off"
          className="field-input w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={contact.relationship}
          onChange={(event) => onChange(index, 'relationship', event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm" htmlFor={phoneId}>
          Phone
        </label>
        <input
          id={phoneId}
          name={`contact_${index}_phone`}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          className="field-input w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={contact.phone}
          onChange={(event) => onChange(index, 'phone', event.target.value)}
        />
      </div>
    </fieldset>
  )
}