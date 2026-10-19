export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path fill="var(--lime)" d="M14 8h36a6 6 0 0 1 6 6v12a6 6 0 0 0 0 12v12a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V38a6 6 0 0 0 0-12V14a6 6 0 0 1 6-6z" />
      <path stroke="var(--lime-ink)" strokeWidth="7" strokeLinecap="round" d="M22 22l20 20M42 22L22 42" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Xopa">
      <LogoMark />
      <span className="font-display font-extrabold text-xl tracking-tight">
        xopa<span className="text-lime-text live-dot">.</span>
      </span>
    </span>
  );
}
