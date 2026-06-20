import { NextResponse } from "next/server";
import {
  pushConfigured,
  db,
  dayLabel,
  PERIOD_LABEL,
  fanOut,
  type StoredSubscription,
} from "@/lib/push";
import { isSameName } from "@/lib/players";
import type { Period, Signup } from "@/lib/types";

// web-push needs the Node runtime (crypto); never cache this endpoint.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "Europe/Madrid";

/** Madrid calendar date (YYYY-MM-DD) for an instant. */
function madridToday(utcMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcMs));
}

/** The calendar date after `iso` (date-only math, no timezone involved). */
function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Daily cron (see vercel.json). Notifies every player who has a match on the
 * whole of tomorrow (Madrid time). Triggered once a day the evening before, so
 * each match is reminded about exactly once; it is intentionally stateless — no
 * "reminded" flag — which is why it must stay a once-a-day job.
 */
export async function GET(req: Request) {
  // When CRON_SECRET is set, require Vercel's "Authorization: Bearer <secret>".
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!pushConfigured) {
    return NextResponse.json({ skipped: "push not configured" });
  }

  const client = db();
  const target = nextDay(madridToday(Date.now()));

  const { data: rows } = await client
    .from("signups")
    .select("date, period, name, match_time")
    .eq("date", target);

  const matches = (rows ?? []) as Pick<
    Signup,
    "date" | "period" | "name" | "match_time"
  >[];

  if (matches.length === 0) {
    return NextResponse.json({ date: target, matches: 0, sent: 0 });
  }

  // How many players each slot has, for the "· N apuntados" line.
  const countBySlot = new Map<string, number>();
  for (const s of matches) {
    const key = `${s.date}-${s.period}`;
    countBySlot.set(key, (countBySlot.get(key) ?? 0) + 1);
  }

  const { data: subRows } = await client
    .from("push_subscriptions")
    .select("endpoint, subscription, name");
  const subs = (subRows ?? []) as StoredSubscription[];

  let sent = 0;
  await Promise.all(
    matches.map(async (s) => {
      const targets = subs.filter(
        (sub) => sub.name && isSameName(sub.name, s.name)
      );
      if (targets.length === 0) return;

      const total = countBySlot.get(`${s.date}-${s.period}`) ?? 1;
      const timePart =
        s.match_time && s.match_time !== "00:00" ? ` a las ${s.match_time}` : "";
      const body =
        `${dayLabel(s.date)} por ${PERIOD_LABEL[s.period as Period]}${timePart}` +
        ` · ${total} apuntad${total === 1 ? "o" : "os"}`;

      const payload = JSON.stringify({
        title: "🎾 Mañana tienes partido",
        body,
        url: `/?date=${s.date}&period=${s.period}`,
        date: s.date,
        period: s.period,
        tag: `reminder-${s.date}-${s.period}`,
      });

      sent += await fanOut(targets, payload);
    })
  );

  return NextResponse.json({ date: target, matches: matches.length, sent });
}
