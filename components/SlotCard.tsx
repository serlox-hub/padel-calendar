"use client";

import { useState } from "react";
import type { Period, Signup } from "@/lib/types";
import { PEOPLE_PER_COURT } from "@/lib/types";
import { avatarColor, initials } from "@/lib/avatar";

/** Selectable times, every 30 min from 07:00 to 23:30. */
const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 23; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

const PERIOD_CONFIG: Record<
  Period,
  { label: string; icon: string; defaultTime: string; ring: string; bg: string }
> = {
  morning: {
    label: "Mañana",
    icon: "🌅",
    defaultTime: "09:30",
    ring: "focus:border-amber-500 focus:ring-amber-200",
    bg: "bg-amber-50",
  },
  afternoon: {
    label: "Tarde",
    icon: "🌇",
    defaultTime: "18:00",
    ring: "focus:border-indigo-500 focus:ring-indigo-200",
    bg: "bg-indigo-50",
  },
};

interface Props {
  period: Period;
  signups: Signup[];
  myName: string;
  disabled?: boolean;
  busy?: boolean;
  onCreate: (time: string) => void;
  onJoin: () => void;
  onLeave: (id: string) => void;
  onEditTime: (time: string) => void;
}

export default function SlotCard({
  period,
  signups,
  myName,
  disabled = false,
  busy = false,
  onCreate,
  onJoin,
  onLeave,
  onEditTime,
}: Props) {
  const cfg = PERIOD_CONFIG[period];
  const [editingTime, setEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState(cfg.defaultTime);

  const occupied = signups.length > 0;
  const matchTime = occupied ? signups[0].match_time : null;
  const count = signups.length;
  const amIIn = signups.some(
    (s) => s.name.toLowerCase() === myName.toLowerCase()
  );

  const courts = Math.ceil(count / PEOPLE_PER_COURT) || 0;
  const remainder = count % PEOPLE_PER_COURT;
  const needed = remainder === 0 ? 0 : PEOPLE_PER_COURT - remainder;

  // Split players into courts of 4 for a clean, grouped list.
  const chunks: Signup[][] = [];
  for (let i = 0; i < count; i += PEOPLE_PER_COURT) {
    chunks.push(signups.slice(i, i + PEOPLE_PER_COURT));
  }

  // Empty future slot → show the time selector right away to create the match.
  const creating = !occupied && !disabled;
  const showEditor = creating || editingTime;

  const confirmTime = () => {
    if (!timeInput) return;
    if (occupied) onEditTime(timeInput);
    else onCreate(timeInput);
    setEditingTime(false);
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 ${
        occupied ? "bg-white" : cfg.bg
      } p-4 shadow-sm`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cfg.icon}</span>
          <span className="text-lg font-semibold text-slate-900">{cfg.label}</span>
        </div>
        {matchTime && !editingTime && (
          <button
            onClick={() => {
              setTimeInput(matchTime);
              setEditingTime(true);
            }}
            disabled={disabled || busy}
            className="rounded-full bg-slate-900 px-4 py-2 text-base font-bold text-white disabled:opacity-50"
            title="Cambiar la hora"
          >
            🕒 {matchTime}
          </button>
        )}
      </div>

      {/* Time selector (creating a match, or editing the time of an existing one) */}
      {showEditor && (
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-600">
            Hora del partido
          </label>
          <select
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-lg outline-none focus:ring-2 ${cfg.ring}`}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <button
              onClick={confirmTime}
              disabled={busy}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white active:scale-95 disabled:opacity-50"
            >
              {occupied ? "Guardar hora" : "Crear partido"}
            </button>
            {editingTime && occupied && (
              <button
                onClick={() => setEditingTime(false)}
                className="rounded-xl px-4 py-3 text-base font-medium text-slate-600"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Players grouped by court */}
      {occupied ? (
        <div className="mt-3 max-h-[52vh] space-y-3 overflow-y-auto">
          {chunks.map((players, ci) => {
            const isLast = ci === chunks.length - 1;
            // Only show free slots while we haven't reached a full court (4).
            const empties =
              isLast && count < PEOPLE_PER_COURT
                ? PEOPLE_PER_COURT - players.length
                : 0;
            return (
              <div key={ci}>
                <div className="mb-1 px-1 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  🏟 Pista {ci + 1}
                </div>
                <div className="space-y-1">
                  {players.map((s) => {
                    const mine =
                      s.name.toLowerCase() === myName.toLowerCase();
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                          mine ? "bg-emerald-50" : "bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(
                            s.name
                          )}`}
                        >
                          {initials(s.name)}
                        </span>
                        <span className="flex-1 truncate text-base text-slate-800">
                          {s.name}
                          {mine && (
                            <span className="ml-1 text-sm font-semibold text-emerald-700">
                              (tú)
                            </span>
                          )}
                        </span>
                        {mine && !disabled && (
                          <button
                            onClick={() => onLeave(s.id)}
                            disabled={busy}
                            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Quitarme
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {Array.from({ length: empties }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-3 px-2 py-2"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-400 text-slate-400">
                        +
                      </span>
                      <span className="text-base text-slate-500">Libre</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        disabled && (
          <p className="mt-3 text-base text-slate-600">No hubo partido.</p>
        )
      )}

      {/* Footer / actions */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm text-slate-600">
          {occupied
            ? `${count} apuntad${count === 1 ? "o" : "os"} · ${courts} pista${
                courts === 1 ? "" : "s"
              }${count < PEOPLE_PER_COURT ? ` · faltan ${needed}` : ""}`
            : ""}
        </span>

        {disabled ? (
          <span className="text-sm text-slate-600">Pasado</span>
        ) : occupied && !amIIn ? (
          <button
            onClick={onJoin}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white active:scale-95 disabled:opacity-50"
          >
            Apuntarme
          </button>
        ) : null}
      </div>
    </div>
  );
}
