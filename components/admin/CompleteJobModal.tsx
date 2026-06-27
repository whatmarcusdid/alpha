'use client';

type Props = {
  isOpen: boolean;
  businessName: string;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CompleteJobModal({
  isOpen,
  businessName,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close completion confirmation"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-950">Mark job as complete?</h2>
        <p className="mt-2 text-base leading-[1.5] text-zinc-600">
          This will move {businessName} to Delivered. This action cannot be undone.
        </p>
        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-h-[40px] rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-950"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="min-h-[40px] rounded-lg bg-[#2563EB] px-6 py-2 font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {isSubmitting ? 'Completing…' : 'Mark Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}
