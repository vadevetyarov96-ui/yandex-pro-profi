"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("profi");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        return;
      }
      const next = searchParams.get("next") || "/airports";
      router.replace(next);
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[var(--gold)]/10 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-[var(--green)]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[#8a6a10] text-black shadow-[0_0_40px_rgba(212,160,23,0.35)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2 4 5v6c0 5.25 3.4 10.15 8 11.4 4.6-1.25 8-6.15 8-11.4V5l-8-3Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-wide text-[var(--gold)]">
            YANDEX PRO PROFI
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Подсказки водителю: аэропорты, вокзалы, поток
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 p-5 shadow-2xl backdrop-blur"
        >
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Логин</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-xl border border-[var(--border)] bg-black/50 px-3 py-3 text-white outline-none transition focus:border-[var(--gold)]"
              required
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-[var(--border)] bg-black/50 px-3 py-3 text-white outline-none transition focus:border-[var(--gold)]"
              required
            />
          </label>

          {error && (
            <p className="mb-3 rounded-lg bg-[#3a1218] px-3 py-2 text-sm text-[#ff8a8a]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[#b8860b] py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Вход…" : "Войти"}
          </button>

          <p className="mt-4 text-center text-[11px] text-[var(--muted)]">
            Регистрация пока недоступна
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}
