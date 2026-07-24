"use client";

import { useState } from "react";

export function CheckoutButton() {
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setMessage(null);
    const response = await fetch("/api/checkout", { method: "POST" });
    if (response.status === 501) {
      setMessage("Checkout ainda não está disponível — em breve.");
      return;
    }
    if (response.ok) {
      const data = (await response.json()) as { redirectUrl?: string };
      if (data.redirectUrl) window.location.href = data.redirectUrl;
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="h-11 w-full rounded-md bg-indigo-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
      >
        Assinar PRO
      </button>
      {message && <p className="text-xs text-zinc-500">{message}</p>}
    </div>
  );
}
