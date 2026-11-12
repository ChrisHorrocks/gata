import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGrams(g: number): string {
  if (g >= 1000) {
    return `${(g / 1000).toFixed(2)} kg`
  }
  return `${Math.round(g)} g`
}
