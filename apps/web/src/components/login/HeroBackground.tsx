export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(99, 102, 241, 0.15)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dot-grid)" />
      </svg>
      <div
        className="absolute inset-0 animate-glow-pulse"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 50%, rgba(99, 102, 241, 0.12) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
