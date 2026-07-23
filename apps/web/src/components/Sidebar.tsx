"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, LogoMark, TargetIcon, TrendingUpIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/opportunities", label: "Oportunidades", Icon: TargetIcon },
  { href: "/trends", label: "Tendências", Icon: TrendingUpIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-5">
        <LogoMark className="h-5 w-5 text-indigo-400" />
        <span className="font-mono text-sm font-semibold tracking-wide text-zinc-100">ShopSpy</span>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "bg-indigo-500/15 text-indigo-300" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <item.Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-zinc-800 px-5 py-4 font-mono text-[11px] text-zinc-500">
        BR + Global · v0.1
      </div>
    </aside>
  );
}
