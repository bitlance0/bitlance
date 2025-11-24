export function AccordionControls({
  expanded,
  onToggleOpen,
  onToggleClosed,
  onTogglePending,
  showPending = false,
}: {
  expanded: "open" | "closed" | "pending" | null;
  onToggleOpen: () => void | Promise<void>;
  onToggleClosed: () => void | Promise<void>;
  onTogglePending?: () => void | Promise<void>;
  showPending?: boolean;
}) {
  return (
    <div className={`grid ${showPending ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
      {/* título */}
      <div className="col-span-full">
        <h2 className="text-base md:text-lg font-semibold mb-4 text-[var(--color-text)] border-l-4 border-[var(--color-primary)] pl-2 block">
          Operaciones
        </h2>
      </div>

      {/* Abiertas */}
      <button
        onClick={onToggleOpen}
        aria-expanded={expanded === "open"}
        type="button"
        className={`flex items-center justify-between w-full px-4 py-3 text-base font-medium rounded-xl border transition-all duration-200
          ${expanded === "open"
            ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
            : "bg-transparent border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"}`}
      >
        <span>Abiertas</span>
        <Chevron expanded={expanded === "open"} />
      </button>

      {/* Pendientes */}
      {showPending && onTogglePending && (
        <button
          onClick={onTogglePending}
          aria-expanded={expanded === "pending"}
          type="button"
          className={`flex items-center justify-between w-full px-4 py-3 text-base font-medium rounded-xl border transition-all duration-200
            ${expanded === "pending"
              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
              : "bg-transparent border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"}`}
        >
          <span>Pendientes</span>
          <Chevron expanded={expanded === "pending"} />
        </button>
      )}

      {/* Cerradas */}
      <button
        onClick={onToggleClosed}
        aria-expanded={expanded === "closed"}
        type="button"
        className={`flex items-center justify-between w-full px-4 py-3 text-base font-medium rounded-xl border transition-all duration-200
          ${expanded === "closed"
            ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
            : "bg-transparent border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"}`}
      >
        <span>Cerradas</span>
        <Chevron expanded={expanded === "closed"} />
      </button>

    </div>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : "rotate-0"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
