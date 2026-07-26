"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CITIES } from "@/lib/cities";
import type { CityId } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [cityId, setCityId] = useState<CityId>("moscow");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  async function saveCity(next: CityId) {
    setCityId(next);
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile/city", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId: next }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить");
      setMessage("Город сохранён");
    } catch {
      setMessage("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <AppHeader showRefresh={false} />
      <main className="px-4 pb-6 pt-4">
        <h1 className="text-3xl font-extrabold text-white">Профиль</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Настройки водителя</p>

        <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted)]">Город</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Пока доступна только Москва. Другие города появятся позже.
          </p>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Выберите город
            </span>
            <select
              value={cityId}
              disabled={saving}
              onChange={(e) => void saveCity(e.target.value as CityId)}
              className="w-full appearance-none rounded-xl border border-[var(--gold)]/50 bg-black/60 px-3 py-3 text-white outline-none focus:border-[var(--gold)]"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {message && (
            <p className="mt-3 text-sm text-[var(--green)]">{message}</p>
          )}
        </section>

        <button
          type="button"
          onClick={() => void logout()}
          disabled={loggingOut}
          className="mt-6 w-full rounded-xl border border-[var(--border)] bg-[var(--card-2)] py-3 text-sm font-semibold text-white transition hover:border-[#5c1218] hover:text-[#ff8a8a] disabled:opacity-60"
        >
          {loggingOut ? "Выход…" : "Выйти"}
        </button>
      </main>
    </>
  );
}
