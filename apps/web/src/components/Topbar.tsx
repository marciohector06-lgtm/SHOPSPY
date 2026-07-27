"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EyeIcon, PackageIcon, TargetIcon, UsersIcon, PlayIcon, TrendingUpIcon, SearchIcon, BellIcon, LogoMark } from "./icons";
import { PeriodSelector } from "./PeriodSelector";
import { LogoutButton } from "./LogoutButton";
import type { AccessTokenPayload } from "../lib/jwt";

const NAV_ITEMS = [
  { href: "/explorar", label: "Explorar", Icon: EyeIcon },
  { href: "/produtos", label: "Produtos", Icon: PackageIcon },
  { href: "/oportunidades", label: "Oportunidades", Icon: TargetIcon },
  { href: "/criadores", label: "Criadores", Icon: UsersIcon },
  { href: "/videos", label: "Vídeos", Icon: PlayIcon },
  { href: "/tendencias", label: "Tendências", Icon: TrendingUpIcon },
];

const PLAN_BADGE: Record<AccessTokenPayload["plan"], string> = {
  FREE: "bg-spy-surface text-spy-muted",
  PRO: "bg-spy-indigo-dim text-spy-indigo-light shadow-[0_0_12px_rgba(99,102,241,0.25)]",
};

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`relative flex min-h-11 items-center gap-1.5 px-3 py-3 text-sm transition-colors duration-150 ${
              active ? "text-spy-indigo-light" : "text-spy-muted hover:text-spy-indigo-light"
            }`}
          >
            <item.Icon className="h-4 w-4" />
            {item.label}
            {active && <span className="absolute inset-x-2 -bottom-px hidden h-0.5 rounded-full bg-spy-indigo lg:block" />}
          </Link>
        );
      })}
    </>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit() {
    const term = value.trim();
    if (!term) return;
    router.push(`/busca?q=${encodeURIComponent(term)}`);
    setOpen(false);
  }

  return (
    <div className="flex items-center">
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
        placeholder="Buscar produto..."
        aria-label="Buscar produto"
        className={`rounded-md border border-spy-border bg-spy-surface text-sm text-spy-text placeholder:text-spy-faint transition-all duration-200 ${
          open ? "mr-1 w-32 px-3 py-2 opacity-100 sm:w-52" : "w-0 border-0 px-0 py-0 opacity-0"
        }`}
      />
      <button
        type="button"
        onClick={() => (open ? submit() : setOpen(true))}
        aria-label="Buscar produto"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-spy-muted hover:bg-spy-hover hover:text-spy-text"
      >
        <SearchIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function AvatarMenu({ user }: { user: AccessTokenPayload }) {
  const [open, setOpen] = useState(false);
  const initials = (user.name ?? user.email).slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu da conta" className="flex h-8 w-8 items-center justify-center rounded-full">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-spy-surface text-xs font-semibold text-spy-text">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar menu da conta"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60]"
          />
          <div className="absolute right-0 top-10 z-[61] w-44 rounded-md border border-spy-border bg-spy-card p-1 shadow-xl">
            <Link
              href="/alertas"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-spy-text hover:bg-spy-hover"
            >
              <BellIcon className="h-4 w-4" />
              Meus alertas
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function Topbar({ user }: { user: AccessTokenPayload }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-spy-border bg-spy-base/85 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="flex h-11 w-11 items-center justify-center rounded-md text-spy-muted hover:bg-spy-hover hover:text-spy-text lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>

          <Link href="/explorar" className="flex min-h-11 items-center gap-2 py-3">
            <LogoMark className="h-5 w-5 text-spy-indigo" />
            <span className="font-display text-sm font-bold text-spy-text">ShopSpy</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <NavLinks pathname={pathname} />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <GlobalSearch />
          <div className="hidden sm:block">
            <PeriodSelector />
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLAN_BADGE[user.plan]}`}>{user.plan}</span>
          <AvatarMenu user={user} />
          <div className="hidden sm:block">
            <LogoutButton />
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col gap-1 bg-spy-card p-4 shadow-xl">
            <div className="mb-2 flex items-center gap-2 px-2 py-2">
              <LogoMark className="h-5 w-5 text-spy-indigo" />
              <span className="font-display text-sm font-bold text-spy-text">ShopSpy</span>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-4 border-t border-spy-border pt-4 sm:hidden">
              <PeriodSelector />
            </div>
            <div className="mt-4 sm:hidden">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
