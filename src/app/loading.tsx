/**
 * Global loading state shown during route transitions.
 */
export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-sm text-on-surface-variant font-medium">
        Cargando...
      </p>
    </div>
  );
}
