import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function openExternalUrl(url: string) {
  if (typeof window === 'undefined') return
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
