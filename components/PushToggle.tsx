"use client";

import { useState } from "react";
import type { PushState } from "./usePushSubscription";

interface Props {
  state: PushState;
  busy: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
}

export default function PushToggle({
  state,
  busy,
  subscribe,
  unsubscribe,
}: Props) {
  const [showHint, setShowHint] = useState(false);

  if (state === "loading" || state === "unsupported") return null;

  // iOS without the PWA installed: explain how to get notifications.
  if (state === "needs-install") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowHint((s) => !s)}
          aria-label="Cómo activar avisos en iPhone"
          className="rounded-full bg-slate-100 px-3 py-2 text-base text-slate-700"
        >
          🔔
        </button>
        {showHint && (
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-xl">
            Para recibir avisos en iPhone: pulsa{" "}
            <span aria-label="compartir">Compartir ⎋</span> y luego{" "}
            <strong>«Añadir a pantalla de inicio»</strong>. Abre la app desde ahí
            y vuelve a tocar 🔔.
          </div>
        )}
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowHint((s) => !s)}
          aria-label="Avisos bloqueados"
          className="rounded-full bg-slate-100 px-3 py-2 text-base text-slate-400"
        >
          🔕
        </button>
        {showHint && (
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-xl">
            Bloqueaste los avisos. Para reactivarlos, permite las notificaciones
            de esta página en los ajustes del navegador.
          </div>
        )}
      </div>
    );
  }

  const subscribed = state === "subscribed";

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={busy}
      aria-label={subscribed ? "Desactivar avisos" : "Activar avisos"}
      className={`rounded-full px-3 py-2 text-base transition active:scale-95 disabled:opacity-50 ${
        subscribed
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {subscribed ? "🔔 ✓" : "🔔"}
    </button>
  );
}
