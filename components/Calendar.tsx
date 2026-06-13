"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Period, Signup } from "@/lib/types";
import {
  dayMonthLabel,
  formatWeekRange,
  getWeek,
  isPast,
  isSameDay,
  toISODate,
  weekdayLabel,
  weekdayShort,
} from "@/lib/dates";
import NameGate from "./NameGate";
import SlotCard from "./SlotCard";
import SlotCell from "./SlotCell";

const NAME_KEY = "padel-name";
const PERIODS: Period[] = ["morning", "afternoon"];

export default function Calendar() {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [openSlot, setOpenSlot] = useState<{ day: Date; period: Period } | null>(
    null
  );

  // Run once on the client to avoid SSR/hydration mismatches with Date & localStorage.
  useEffect(() => {
    setMounted(true);
    setToday(new Date());
    setName(localStorage.getItem(NAME_KEY));
  }, []);

  const days = useMemo(
    () => (today ? getWeek(today, weekOffset) : null),
    [today, weekOffset]
  );

  const fetchSignups = useCallback(async () => {
    if (!supabase || !days) return;
    const from = toISODate(days[0]);
    const to = toISODate(days[6]);
    const { data, error } = await supabase
      .from("signups")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }
    setSignups((data ?? []) as Signup[]);
  }, [days]);

  // Initial load + realtime subscription.
  useEffect(() => {
    if (!supabase || !days) return;
    const client = supabase;
    fetchSignups();
    const channel = client
      .channel("signups-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signups" },
        () => fetchSignups()
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [fetchSignups, days]);

  const saveName = (n: string) => {
    localStorage.setItem(NAME_KEY, n);
    setName(n);
  };

  const slotSignups = useCallback(
    (dateISO: string, period: Period) =>
      signups.filter((s) => s.date === dateISO && s.period === period),
    [signups]
  );

  const run = async (fn: () => Promise<{ error: { message: string } | null }>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error } = await fn();
    if (error) {
      setError(
        error.message.includes("duplicate") || error.message.includes("unique")
          ? "Ya estás apuntado en ese turno."
          : error.message
      );
    }
    await fetchSignups();
    setBusy(false);
  };

  const createMatch = (dateISO: string, period: Period, time: string) =>
    run(async () => {
      if (!supabase) return { error: null };
      return supabase
        .from("signups")
        .insert({ date: dateISO, period, name, match_time: time });
    });

  const joinMatch = (dateISO: string, period: Period) =>
    run(async () => {
      if (!supabase) return { error: null };
      const existing = slotSignups(dateISO, period)[0];
      return supabase.from("signups").insert({
        date: dateISO,
        period,
        name,
        match_time: existing?.match_time ?? "00:00",
      });
    });

  const leaveMatch = (id: string) =>
    run(async () => {
      if (!supabase) return { error: null };
      return supabase.from("signups").delete().eq("id", id);
    });

  const editTime = (dateISO: string, period: Period, time: string) =>
    run(async () => {
      if (!supabase) return { error: null };
      return supabase
        .from("signups")
        .update({ match_time: time })
        .eq("date", dateISO)
        .eq("period", period);
    });

  // --- Render states ---

  if (!isSupabaseConfigured) {
    return <SetupHelp />;
  }

  if (!mounted || !days) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Cargando…
      </div>
    );
  }

  if (!name) {
    return <NameGate onSubmit={saveName} />;
  }

  const openISO = openSlot ? toISODate(openSlot.day) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-16 pt-5 sm:px-4">
      {editingName && (
        <NameGate
          currentName={name}
          onSubmit={(n) => {
            saveName(n);
            setEditingName(false);
          }}
          onCancel={() => setEditingName(false)}
        />
      )}

      {/* Slot detail */}
      {openSlot && openISO && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center"
          onClick={() => setOpenSlot(null)}
        >
          <div
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-1 text-white">
              <span className="font-semibold">
                {weekdayLabel(openSlot.day)} · {dayMonthLabel(openSlot.day)}
              </span>
              <button
                onClick={() => setOpenSlot(null)}
                className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
            <SlotCard
              period={openSlot.period}
              signups={slotSignups(openISO, openSlot.period)}
              myName={name}
              disabled={isPast(openSlot.day, today!)}
              busy={busy}
              onCreate={(time) => createMatch(openISO, openSlot.period, time)}
              onJoin={() => joinMatch(openISO, openSlot.period)}
              onLeave={leaveMatch}
              onEditTime={(time) => editTime(openISO, openSlot.period, time)}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            🎾 No puedo, tengo pádel
          </h1>
          <button
            onClick={() => setEditingName(true)}
            aria-label="Cambiar mi nombre"
            className="rounded-full bg-slate-100 px-4 py-2 text-base text-slate-700"
          >
            {name} ✎
          </button>
        </div>

        {/* Week navigator */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Semana anterior"
            className="rounded-xl bg-slate-100 px-5 py-3 text-2xl font-bold leading-none text-slate-700 active:scale-95"
          >
            ‹
          </button>
          <div className="flex flex-1 flex-col items-center">
            <span className="text-lg font-semibold text-slate-900">
              {formatWeekRange(days)}
            </span>
            {weekOffset !== 0 ? (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-sm font-semibold text-emerald-700 underline"
              >
                Volver a hoy
              </button>
            ) : (
              <span className="text-sm text-slate-600">Esta semana</span>
            )}
          </div>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Semana siguiente"
            className="rounded-xl bg-slate-100 px-5 py-3 text-2xl font-bold leading-none text-slate-700 active:scale-95"
          >
            ›
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-base text-red-700">
          {error}
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[3.25rem_1fr_1fr] gap-1.5 px-0.5 pb-1.5 text-center text-sm font-semibold text-slate-600">
        <span />
        <span>🌅 Mañana</span>
        <span>🌇 Tarde</span>
      </div>

      {/* Week grid: one row per day */}
      <div className="space-y-1.5">
        {days.map((day) => {
          const dateISO = toISODate(day);
          const past = isPast(day, today!);
          const todayMark = isSameDay(day, today!);
          return (
            <div
              key={dateISO}
              className="grid grid-cols-[3.25rem_1fr_1fr] items-stretch gap-1.5"
            >
              <div
                className={`flex flex-col items-center justify-center rounded-xl py-1 ${
                  todayMark ? "bg-emerald-100 text-emerald-800" : "text-slate-600"
                } ${past ? "opacity-50" : ""}`}
              >
                <span className="text-sm font-medium uppercase leading-none">
                  {weekdayShort(day)}
                </span>
                <span className="text-xl font-bold leading-tight">
                  {day.getDate()}
                </span>
              </div>
              {PERIODS.map((period) => (
                <SlotCell
                  key={period}
                  period={period}
                  signups={slotSignups(dateISO, period)}
                  myName={name}
                  disabled={past}
                  onClick={() => setOpenSlot({ day, period })}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SetupHelp() {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-900">🎾 Casi listo</h1>
      <p className="mt-3 text-slate-600">
        Falta conectar Supabase. Crea un proyecto gratis en{" "}
        <a
          className="font-semibold text-emerald-600 underline"
          href="https://supabase.com"
          target="_blank"
          rel="noreferrer"
        >
          supabase.com
        </a>
        , ejecuta <code className="rounded bg-slate-100 px-1">supabase/schema.sql</code> en el
        SQL editor, y copia tus claves a un archivo{" "}
        <code className="rounded bg-slate-100 px-1">.env.local</code> (mira{" "}
        <code className="rounded bg-slate-100 px-1">.env.local.example</code>).
      </p>
    </div>
  );
}
