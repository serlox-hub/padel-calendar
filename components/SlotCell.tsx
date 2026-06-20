"use client";

import type { Period, Signup } from "@/lib/types";
import { avatarColor, initials } from "@/lib/avatar";
import { isSameName } from "@/lib/players";
import { PERIOD_META } from "@/lib/periods";
import { slotStatus } from "@/lib/slots";

interface Props {
  period: Period;
  signups: Signup[];
  myName: string;
  now: Date;
  disabled?: boolean;
  onClick: () => void;
}

const MAX_AVATARS = 4;

/** One compact morning/afternoon cell inside the weekly grid. Tap to open detail. */
export default function SlotCell({
  period,
  signups,
  myName,
  now,
  disabled = false,
  onClick,
}: Props) {
  const occupied = signups.length > 0;
  const count = signups.length;
  const time = occupied ? signups[0].match_time : null;
  const amIIn = signups.some((s) => isSameName(s.name, myName));

  const status = occupied
    ? slotStatus(signups[0].date, time, count, now)
    : "empty";
  const cancelled = status === "cancelled";

  const muted = disabled || cancelled;

  let cls = "border-slate-200 bg-white";
  if (cancelled) cls = "border-slate-200 bg-slate-50";
  else if (disabled) cls = "border-slate-100 bg-slate-50";
  else if (amIIn) cls = "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300";
  else if (occupied) cls = PERIOD_META[period].cellTint;

  const shown = signups.slice(0, MAX_AVATARS);
  const extra = count - shown.length;

  return (
    <button
      onClick={onClick}
      disabled={disabled && !occupied}
      className={`flex min-h-[4.5rem] w-full flex-col justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.97] ${cls}`}
    >
      {occupied ? (
        <>
          <span className="flex items-center gap-1 overflow-hidden whitespace-nowrap text-base font-bold leading-none">
            {amIIn && !cancelled && (
              <span className="text-emerald-600" title="Estás apuntado">
                ✓
              </span>
            )}
            <span
              className={
                cancelled
                  ? "text-slate-500 line-through"
                  : disabled
                    ? "text-slate-500"
                    : "text-slate-900"
              }
            >
              {time}
            </span>
            {cancelled && (
              <span className="text-xs font-semibold text-rose-600">
                Cancelado
              </span>
            )}
          </span>
          <div className="flex items-center">
            {shown.map((s, i) => {
              const mine = isSameName(s.name, myName);
              return (
                <span
                  key={s.id}
                  title={s.name}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ${
                    mine ? "ring-emerald-500" : "ring-white"
                  } ${avatarColor(s.name)} ${i > 0 ? "-ml-2" : ""} ${
                    muted ? "opacity-50 grayscale" : ""
                  }`}
                >
                  {initials(s.name)}
                </span>
              );
            })}
            {extra > 0 && (
              <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-700 ring-2 ring-white">
                +{extra}
              </span>
            )}
          </div>
        </>
      ) : disabled ? (
        <span className="text-sm text-slate-500">—</span>
      ) : (
        <span className="text-sm font-semibold text-emerald-700">+ Crear</span>
      )}
    </button>
  );
}
