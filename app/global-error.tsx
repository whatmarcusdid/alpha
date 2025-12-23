'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[#1B4332] mb-4">
              Something went wrong!
            </h2>
            <button
              onClick={() => reset()}
              className="px-6 py-2 bg-[#9be382] text-[#1B4332] rounded-full hover:bg-[#8dd270]"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
