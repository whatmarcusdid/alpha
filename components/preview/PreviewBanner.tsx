type PreviewBannerProps = {
  designQuestion?: string;
};

export function PreviewBanner({ designQuestion }: PreviewBannerProps) {
  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">
        Preview — fixture data only
      </p>
      {designQuestion != null && (
        <p className="mt-1 text-sm text-amber-800">{designQuestion}</p>
      )}
    </div>
  );
}
