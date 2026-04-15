"use client";

/**
 * Global error boundary for the Maree app.
 * Catches unhandled errors in any route segment.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <span className="material-symbols-outlined text-5xl text-error mb-4">
        error
      </span>
      <h2 className="font-headline font-bold text-2xl text-primary mb-2">
        Algo salió mal
      </h2>
      <p className="text-sm text-on-surface-variant max-w-md mb-6">
        {error.message || "Se produjo un error inesperado. Intenta de nuevo."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-primary text-on-primary rounded-full font-semibold text-sm hover:bg-primary-container transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
