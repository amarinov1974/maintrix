interface SuccessOverlayProps {
  message: string;
}

export function SuccessOverlay({ message }: SuccessOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="bg-green-100 border-2 border-green-500 rounded-lg p-6 max-w-md w-full text-center">
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
