import type { AccessTokenPayload } from "../lib/jwt";
import { LogoutButton } from "./LogoutButton";

const PLAN_BADGE: Record<AccessTokenPayload["plan"], string> = {
  FREE: "bg-zinc-800 text-zinc-300",
  PRO: "bg-indigo-500/20 text-indigo-300",
};

export function Header({ user }: { user: AccessTokenPayload }) {
  const initials = (user.name ?? user.email).slice(0, 1).toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_BADGE[user.plan]}`}>{user.plan}</span>

      <div className="flex items-center gap-3">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
            {initials}
          </span>
        )}
        <span className="text-sm text-zinc-300">{user.name ?? user.email}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
