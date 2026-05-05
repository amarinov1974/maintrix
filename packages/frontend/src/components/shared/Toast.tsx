interface ToastProps {
  message: string;
  variant?: 'success' | 'info';
}

/**
 * Brief notification banner anchored to the top of the viewport.
 * Use with `useToast()` for auto-dismiss behaviour.
 */
export function Toast({ message, variant = 'success' }: ToastProps) {
  const palette =
    variant === 'success'
      ? 'bg-green-100 border-green-500 text-green-800'
      : 'bg-blue-100 border-blue-500 text-blue-800';
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70]">
      <div className={`${palette} border-2 rounded-lg px-6 py-3 shadow-lg max-w-md`}>
        <p className="font-medium text-sm whitespace-pre-line">✓ {message}</p>
      </div>
    </div>
  );
}
