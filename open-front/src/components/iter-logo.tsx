// Logo ITER : hexagone sombre ajoure, hexagone saumon en surimpression,
// puis le mot-symbole "Iter" et la baseline "Digital Passport".
export function IterLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-end gap-1">
        <svg
          viewBox="0 0 44 48"
          className="h-9 w-8 shrink-0"
          aria-hidden
          fill="none"
        >
          <path
            d="M21 3.6 36.4 12.5a3.2 3.2 0 0 1 1.6 2.8v17.4a3.2 3.2 0 0 1-1.6 2.8L21 44.4a3.2 3.2 0 0 1-3.2 0L2.4 35.5A3.2 3.2 0 0 1 .8 32.7V15.3a3.2 3.2 0 0 1 1.6-2.8L17.8 3.6a3.2 3.2 0 0 1 3.2 0Z"
            transform="translate(3 0)"
            stroke="#16243f"
            strokeWidth="4.2"
          />
          <path
            d="M14.5 13.2 24.9 19.2a2.2 2.2 0 0 1 1.1 1.9v11.8a2.2 2.2 0 0 1-1.1 1.9l-10.4 6a2.2 2.2 0 0 1-2.2 0l-10.4-6A2.2 2.2 0 0 1 .8 32.9V21.1a2.2 2.2 0 0 1 1.1-1.9l10.4-6a2.2 2.2 0 0 1 2.2 0Z"
            transform="translate(0 -6)"
            fill="#e8836b"
            opacity="0.95"
          />
        </svg>
        <span className="text-[30px] leading-none font-bold tracking-tight text-iter-ink">
          Iter
        </span>
      </div>
      <p className="mt-0.5 pl-9 text-[7px] font-medium tracking-[0.18em] text-iter-ink/70 uppercase">
        Digital Passport
      </p>
    </div>
  )
}
