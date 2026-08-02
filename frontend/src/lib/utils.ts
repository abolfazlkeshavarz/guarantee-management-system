import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1").replace(/\/api\/v1\/?$/, "")

// Resolves a file path returned by the backend (uploads, etc.) into an
// absolute URL. New uploads already come back absolute; this also covers
// older records saved as a bare "/uploads/..." path.
export function resolveFileUrl(path?: string | null): string {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`
}
