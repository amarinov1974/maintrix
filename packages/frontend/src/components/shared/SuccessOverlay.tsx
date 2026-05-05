interface SuccessOverlayProps {
  message: string;
}

/**
 * Success overlay shown for ~2s after a ticket action completes.
 * Anchored to the top of the viewport so it appears in the same place
 * regardless of whether it's rendered inside a centered-flex modal
 * backdrop or inline on a page (matches the SM submit page reference).
 */
export function SuccessOverlay({ message }: SuccessOverlayProps) {
  return (
    <div className="self-start mt-24 max-w-md w-full mx-4">
      <div className="bg-green-100 border-2 border-green-500 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold text-xl mb-2">
          ✓ {message}
        </p>
        <p className="text-green-700 text-sm">
          Povratak na nadzornu ploču za 2 sekunde...
        </p>
      </div>
    </div>
  );
}
