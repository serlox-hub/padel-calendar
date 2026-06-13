export type Period = "morning" | "afternoon";

export interface Signup {
  id: string;
  /** ISO date, e.g. "2026-06-15" */
  date: string;
  period: Period;
  name: string;
  /** "HH:MM", set by the first person who signs up */
  match_time: string;
  created_at: string;
}

export const PEOPLE_PER_COURT = 4;
