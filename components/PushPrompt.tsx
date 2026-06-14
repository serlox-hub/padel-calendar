"use client";

interface Props {
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

/** Friendly in-app pre-prompt. The native permission dialog only fires from "Activar". */
export default function PushPrompt({ busy, onAccept, onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl"
      >
        <div className="mb-1 text-4xl">🔔</div>
        <h2 className="text-xl font-bold text-slate-900">
          ¿Te aviso de los partidos?
        </h2>
        <p className="mt-2 text-base text-slate-600">
          Recibe una notificación en el móvil cuando alguien se apunte a un
          partido. Puedes desactivarlo cuando quieras.
        </p>
        <button
          onClick={onAccept}
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          Activar avisos
        </button>
        <button
          onClick={onDismiss}
          disabled={busy}
          className="mt-2 w-full rounded-xl py-3 text-base font-medium text-slate-600 transition active:scale-[0.98]"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
