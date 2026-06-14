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
  weekOffsetBetween,
} from "@/lib/dates";
import { PERIODS, PERIOD_META } from "@/lib/periods";
import NameGate from "./NameGate";
import PushToggle from "./PushToggle";
import PushPrompt from "./PushPrompt";
import SlotCard from "./SlotCard";
import SlotCell from "./SlotCell";
import { usePushSubscription } from "./usePushSubscription";
import { notifyNewSignup } from "@/app/actions";

const NAME_KEY = "padel-name";
const PUSH_ASKED_KEY = "padel-push-asked";

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
  const [askPush, setAskPush] = useState(false);
  const push = usePushSubscription(name ?? "");

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

  // Mobile browsers suspend the realtime socket while the app is backgrounded,
  // so events are missed. Refetch whenever it returns to the foreground (e.g.
  // when opened from a push notification) to avoid showing stale data.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") fetchSignups();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [fetchSignups]);

  // Offer notifications once, right after the name is set — but only when the
  // browser can actually subscribe and we haven't asked on this device before.
  useEffect(() => {
    if (
      name &&
      push.state === "default" &&
      !localStorage.getItem(PUSH_ASKED_KEY)
    ) {
      setAskPush(true);
    }
  }, [name, push.state]);

  // Jump to a given slot, switching to whatever week contains it. Used by the
  // notification deep-links (both the cold-open query params and the live
  // service-worker message when the app is already foregrounded).
  const openSlotByDate = useCallback(
    (dateISO: string, period: Period) => {
      // Anchor at midday so the date never slips across a timezone boundary.
      const day = new Date(`${dateISO}T12:00:00`);
      if (!today || Number.isNaN(day.getTime())) return;
      setWeekOffset(weekOffsetBetween(today, day));
      setOpenSlot({ day, period });
    },
    [today]
  );

  // Cold open from a push notification: read the deep-link query params once the
  // user has a name (the slot modal only renders then), then strip them so a
  // manual refresh doesn't reopen the slot.
  useEffect(() => {
    if (!today || !name) return;
    const params = new URLSearchParams(window.location.search);
    const date = params.get("date");
    const period = params.get("period");
    if (date && (period === "morning" || period === "afternoon")) {
      openSlotByDate(date, period);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [today, name, openSlotByDate]);

  // Warm open: the service worker tells us which slot to show when the app was
  // already running and got focused from a notification click.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (
        d?.type === "open-slot" &&
        d.date &&
        (d.period === "morning" || d.period === "afternoon")
      ) {
        openSlotByDate(d.date, d.period);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [openSlotByDate]);

  const dismissPush = () => {
    localStorage.setItem(PUSH_ASKED_KEY, "1");
    setAskPush(false);
  };

  const acceptPush = async () => {
    await push.subscribe();
    dismissPush();
  };

  const saveName = (n: string) => {
    localStorage.setItem(NAME_KEY, n);
    setName(n);
  };

  const slotSignups = useCallback(
    (dateISO: string, period: Period) =>
      signups.filter((s) => s.date === dateISO && s.period === period),
    [signups]
  );

  const run = async (
    fn: () => Promise<{ error: { message: string } | null }>
  ) => {
    if (busy) return { error: null as { message: string } | null };
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
    return { error };
  };

  // Fire a push to everyone (fire-and-forget — never block the UI on it).
  const announce = (dateISO: string, period: Period, matchTime: string) => {
    if (!name) return;
    notifyNewSignup({ signerName: name, dateISO, period, matchTime }).catch(
      () => {}
    );
  };

  const createMatch = async (dateISO: string, period: Period, time: string) => {
    const { error } = await run(async () => {
      if (!supabase) return { error: null };
      return supabase
        .from("signups")
        .insert({ date: dateISO, period, name, match_time: time });
    });
    if (!error) announce(dateISO, period, time);
  };

  const joinMatch = async (dateISO: string, period: Period) => {
    const existing = slotSignups(dateISO, period)[0];
    const matchTime = existing?.match_time ?? "00:00";
    const { error } = await run(async () => {
      if (!supabase) return { error: null };
      return supabase.from("signups").insert({
        date: dateISO,
        period,
        name,
        match_time: matchTime,
      });
    });
    if (!error) announce(dateISO, period, matchTime);
  };

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

      {askPush && (
        <PushPrompt
          busy={push.busy}
          onAccept={acceptPush}
          onDismiss={dismissPush}
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
              now={today!}
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
          <div className="flex items-center gap-2">
            <PushToggle
              state={push.state}
              busy={push.busy}
              subscribe={push.subscribe}
              unsubscribe={push.unsubscribe}
            />
            <button
              onClick={() => setEditingName(true)}
              aria-label="Cambiar mi nombre"
              className="rounded-full bg-slate-100 px-4 py-2 text-base text-slate-700"
            >
              {name} ✎
            </button>
          </div>
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
        {PERIODS.map((p) => (
          <span key={p}>
            {PERIOD_META[p].icon} {PERIOD_META[p].label}
          </span>
        ))}
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
                  now={today!}
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
