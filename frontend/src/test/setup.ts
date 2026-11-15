import '@testing-library/jest-dom/vitest'

// jsdom does not implement <dialog>.showModal()
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.open = false
}