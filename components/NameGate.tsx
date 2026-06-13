"use client";

import { useState } from "react";

interface Props {
  onSubmit: (name: string) => void;
  /** Prefill the input (when editing an existing name). */
  currentName?: string;
  /** If provided, shows a cancel option and allows dismissing without saving. */
  onCancel?: () => void;
}

export default function NameGate({ onSubmit, currentName, onCancel }: Props) {
  const [value, setValue] = useState(currentName ?? "");
  const trimmed = value.trim();
  const editing = Boolean(onCancel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSubmit(trimmed);
        }}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
      >
        <div className="mb-1 text-4xl">🎾</div>
        <h1 className="text-xl font-bold text-slate-900">
          {editing ? "Cambiar nombre" : "No puedo, tengo pádel"}
        </h1>
        <p className="mt-1 text-base text-slate-600">
          ¿Con qué nombre quieres que te vean?
        </p>
        <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
          Elige un nombre <strong>único</strong> para que no te confundan con
          otro jugador (p. ej. añade tu apellido o inicial: «Ana M.»).
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tu nombre"
          maxLength={24}
          className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <button
          type="submit"
          disabled={!trimmed}
          className="mt-3 w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {editing ? "Guardar" : "Entrar"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 w-full rounded-xl py-3 text-base font-medium text-slate-600 transition active:scale-[0.98]"
          >
            Cancelar
          </button>
        )}
      </form>
    </div>
  );
}
