import { Button } from './Button';

interface AlertModalProps {
  message: string;
  title?: string;
  confirmLabel?: string;
  onClose: () => void;
}

/**
 * App-level replacement for `window.alert()`. Single OK button,
 * dismissible by clicking the backdrop.
 */
export function AlertModal({ message, title, confirmLabel = 'U redu', onClose }: AlertModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title != null && (
          <div className="px-6 pt-6">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        )}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>
        </div>
        <div className="px-6 pb-6 flex justify-end">
          <Button type="button" onClick={onClose}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
