import type { Period } from "./types";

/** Canonical order of the two daily slots. */
export const PERIODS: Period[] = ["morning", "afternoon"];

interface PeriodMeta {
  label: string;
  icon: string;
  /** Pre-selected time when creating a match in this slot. */
  defaultTime: string;
  /** Background for an empty SlotCard. */
  cardBg: string;
  /** Focus ring for the time <select>. */
  focusRing: string;
  /** Tint for an occupied grid cell (when it isn't "mine"). */
  cellTint: string;
}

/** Single source of truth for everything that differs between morning/afternoon. */
export const PERIOD_META: Record<Period, PeriodMeta> = {
  morning: {
    label: "Mañana",
    icon: "🌅",
    defaultTime: "09:30",
    cardBg: "bg-amber-50",
    focusRing: "focus:border-amber-500 focus:ring-amber-200",
    cellTint: "border-amber-200 bg-amber-50",
  },
  afternoon: {
    label: "Tarde",
    icon: "🌇",
    defaultTime: "18:00",
    cardBg: "bg-indigo-50",
    focusRing: "focus:border-indigo-500 focus:ring-indigo-200",
    cellTint: "border-indigo-200 bg-indigo-50",
  },
};
