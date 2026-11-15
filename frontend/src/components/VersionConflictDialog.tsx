import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'

type VersionConflictDialogProps = {
  open: boolean
  onReload: () => void
  onDismiss: () => void
  /** Noun phrase after "latest", e.g. "trip details" or "itinerary". */
  resourceLabel?: string
}

/** Shown when a versioned save returns 409. Reload applies the server's current row. */
export function VersionConflictDialog({
  open,
  onReload,
  onDismiss,
  resourceLabel = 'trip details',
}: VersionConflictDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="version-conflict-title"
      aria-describedby="version-conflict-desc"
      onCancel={(event) => {
        event.preventDefault()
        onDismiss()
      }}
    >
      <div className="space-y-4">
        <h2 id="version-conflict-title" className="text-lg font-semibold">
          Someone else saved first
        </h2>
        <p id="version-conflict-desc" className="text-sm text-muted-foreground">
          Your edit was based on an older version. Reload to see the latest {resourceLabel}, then try
          your change again.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" autoFocus onClick={onDismiss}>
            Keep editing
          </Button>
          <Button type="button" onClick={onReload}>
            Reload
          </Button>
        </div>
      </div>
    </dialog>
  )
}