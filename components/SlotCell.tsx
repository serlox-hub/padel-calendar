"use client";

import type { Period, Signup } from "@/lib/types";
import { avatarColor, initials } from "@/lib/avatar";

interface Props {
  period: Period;
  signups: Signup[];
  myName: string;
  disabled?: boolean;
  onClick: () => void;
}

const MAX_AVATARS = 4;

/** One compact morning/afternoon cell inside the weekly grid. Tap to open detail. */
export default function SlotCell({
  period,
  signups,
  myName,
  disabled = false,
  onClick,
}: Props) {
  const occupied = signups.length > 0;
  const count = signups.length;
  const time = occupied ? signups[0].match_time : null;
  const amIIn = signups.some(
    (s) => s.name.toLowerCase() === myName.toLowerCase()
  );

  const accent = period === "morning" ? "amber" : "indigo";

  let cls = "border-slate-200 bg-white";
  if (disabled) cls = "border-slate-100 bg-slate-50";
  else if (amIIn) cls = "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300";
  else if (occupied)
    cls =
      accent === "amber"
        ? "border-amber-200 bg-amber-50"
        : "border-indigo-200 bg-indigo-50";

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
          <span
            className={`flex items-center gap-1 text-base font-bold leading-none ${
              disabled ? "text-slate-500" : "text-slate-900"
            }`}
          >
            {amIIn && (
              <span className="text-emerald-600" title="Estás apuntado">
                ✓
              </span>
            )}
            {time}
          </span>
          <div className="flex items-center">
            {shown.map((s, i) => {
              const mine = s.name.toLowerCase() === myName.toLowerCase();
              return (
                <span
                  key={s.id}
                  title={s.name}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ${
                    mine ? "ring-emerald-500" : "ring-white"
                  } ${avatarColor(s.name)} ${i > 0 ? "-ml-2" : ""} ${
                    disabled ? "opacity-60" : ""
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
        <span className="text-sm text-slate-400">—</span>
      ) : (
        <span className="text-sm font-semibold text-emerald-700">+ Crear</span>
      )}
    </button>
  );
}
