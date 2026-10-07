// Guarantee codes are printed on the product in Latin characters, so they are
// only ever typed in Latin characters. A phone keyboard set to Persian happily
// produces look-alike letters and digits (۱۲۳ ٤٥٦ ب ی ...) that can never match
// a real code, so they are dropped as they are typed instead of being left to
// fail at the lookup.
//
// This is the same rule the server enforces; keep the two in step.

const DISALLOWED = /[^A-Za-z0-9\-_./]/g
const ALLOWED = /^[A-Za-z0-9\-_./]+$/

/** Strips everything a guarantee code cannot contain. */
export function sanitizeGuaranteeCode(value: string): string {
  return value.replace(DISALLOWED, '')
}

export function isValidGuaranteeCode(value: string): boolean {
  return ALLOWED.test(value)
}
