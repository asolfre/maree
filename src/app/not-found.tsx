import Link from "next/link";

/**
 * 404 Not Found page.
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <span className="material-symbols-outlined text-6xl text-outline mb-4">
        explore_off
      </span>
      <h2 className="font-headline font-bold text-3xl text-primary mb-2">
        404
      </h2>
      <p className="text-lg text-on-surface-variant mb-1">
        Página no encontrada
      </p>
      <p className="text-sm text-on-surface-variant max-w-md mb-8">
        La página que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-primary text-on-primary rounded-full font-semibold text-sm hover:bg-primary-container transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
