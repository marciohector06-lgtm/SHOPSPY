const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl">🕵️</span>
        <h1 className="font-mono text-xl font-semibold text-zinc-100">ShopSpy</h1>
        <p className="text-sm text-zinc-500">Inteligência de produtos virais BR + Global</p>
      </div>

      <a
        href={`${API_URL}/auth/google`}
        className="flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.41 3.58v2.98h3.86c2.26-2.08 3.6-5.14 3.6-8.8z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-2.98c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
          />
          <path fill="#FBBC05" d="M5.27 14.31A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.37-2.31V6.6H1.29A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.29 5.4l3.98-3.09z" />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
          />
        </svg>
        Entrar com Google
      </a>
    </div>
  );
}
