const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function GoogleLoginButton() {
  return (
    <a
      href={`${API_URL}/auth/google`}
      className="group flex h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-brand-surface text-[15px] font-medium text-ink-primary transition-all duration-200 ease-out hover:-translate-y-px hover:border-brand-primary/60 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]"
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
      Continuar com Google
    </a>
  );
}
