/** Shared low-level helpers for query modules. */

export function nowUTC(): string {
  return new Date().toISOString();
}
