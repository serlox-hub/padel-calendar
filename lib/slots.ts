import { PEOPLE_PER_COURT } from "./types";

export type SlotStatus = "empty" | "upcoming" | "played" | "cancelled";

/** Local Date for a slot's start (yyyy-mm-dd + HH:MM), without any UTC shift. */
export function slotStart(dateISO: string, matchTime: string): Date {
  return new Date(`${dateISO}T${matchTime || "00:00"}:00`);
}

/**
 * - `empty`     → nobody signed up
 * - `upcoming`  → has players and the start time hasn't passed yet
 * - `played`    → time passed with a full court (>= 4 players)
 * - `cancelled` → time passed without reaching 4 players
 */
export function slotStatus(
  dateISO: string,
  matchTime: string | null,
  count: number,
  now: Date
): SlotStatus {
  if (count === 0) return "empty";
  if (slotStart(dateISO, matchTime ?? "00:00").getTime() > now.getTime()) {
    return "upcoming";
  }
  return count >= PEOPLE_PER_COURT ? "played" : "cancelled";
}
