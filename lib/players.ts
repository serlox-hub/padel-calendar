import { PEOPLE_PER_COURT } from "./types";

/**
 * Identity in this app is the free-text display name (no login), so player
 * matching is a case-insensitive, trimmed name comparison.
 */
export function isSameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** How many padel courts (4 players each) a sign-up count fills. */
export function courtsFor(count: number): number {
  return Math.ceil(count / PEOPLE_PER_COURT) || 0;
}
