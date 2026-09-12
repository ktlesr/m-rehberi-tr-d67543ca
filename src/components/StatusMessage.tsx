import { LoaderCircle, TriangleAlert } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-stone-500">
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </p>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="h-4 w-4" aria-hidden />
        Something went wrong
      </p>
      <p className="mt-1">{error.message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 underline">
          Try again
        </button>
      )}
    </div>
  );
}
