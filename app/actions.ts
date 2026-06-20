"use server";

import type { Period } from "@/lib/types";
import {
  pushConfigured,
  db,
  dayLabel,
  PERIOD_LABEL,
  fanOut,
  type StoredSubscription,
} from "@/lib/push";

/** Save (or refresh) a browser's push subscription. */
export async function subscribeUser(
  sub: StoredSubscription["subscription"],
  name: string
) {
  if (!pushConfigured) return { success: false };
  await db()
    .from("push_subscriptions")
    .upsert(
      { endpoint: sub.endpoint, subscription: sub, name },
      { onConflict: "endpoint" }
    );
  return { success: true };
}

/** Forget a subscription when the user turns notifications off. */
export async function unsubscribeUser(endpoint: string) {
  if (!pushConfigured) return { success: false };
  await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { success: true };
}

/**
 * Fan out a push to everyone (except the person who just signed up) telling
 * them a new player joined a slot. Dead subscriptions are pruned automatically.
 */
export async function notifyNewSignup(payload: {
  signerName: string;
  dateISO: string;
  period: Period;
  matchTime: string;
}) {
  if (!pushConfigured) return { success: false };
  const client = db();

  const { count } = await client
    .from("signups")
    .select("*", { count: "exact", head: true })
    .eq("date", payload.dateISO)
    .eq("period", payload.period);

  const total = count ?? 0;
  const timePart =
    payload.matchTime && payload.matchTime !== "00:00"
      ? ` a las ${payload.matchTime}`
      : "";

  const body =
    `${dayLabel(payload.dateISO)} por ${PERIOD_LABEL[payload.period]}${timePart}` +
    ` · ${total} apuntad${total === 1 ? "o" : "os"}`;

  const notification = JSON.stringify({
    title: `🎾 ${payload.signerName} se ha apuntado`,
    body,
    // Deep-link straight to the slot that changed.
    url: `/?date=${payload.dateISO}&period=${payload.period}`,
    date: payload.dateISO,
    period: payload.period,
    tag: `${payload.dateISO}-${payload.period}`,
  });

  const { data: subs } = await client
    .from("push_subscriptions")
    .select("endpoint, subscription, name");

  if (!subs) return { success: true, sent: 0 };

  const targets = (subs as StoredSubscription[]).filter(
    (s) => s.name !== payload.signerName
  );

  const sent = await fanOut(targets, notification);
  return { success: true, sent };
}
