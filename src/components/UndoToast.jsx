import { Undo2 } from 'lucide-react';

/**
 * Toast body with an Undo action. Rendered inside a react-hot-toast toast so a
 * destructive inbox action (archive, bulk) can be reversed in one click.
 */
export default function UndoToast({ message, onUndo, onDismiss }) {
  return (
    <span className="flex items-center gap-3 text-sm">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => {
          onUndo?.();
          onDismiss?.();
        }}
        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <Undo2 className="h-3.5 w-3.5" />
        Undo
      </button>
    </span>
  );
}
