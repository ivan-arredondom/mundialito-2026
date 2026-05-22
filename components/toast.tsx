'use client'

export default function Toast({
  messages,
  onDismiss,
}: {
  messages: string[]
  onDismiss: () => void
}) {
  if (!messages.length) return null
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
      <div className="bg-red-600 text-white rounded-xl p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm">
            {messages.length === 1 ? (
              <p className="font-semibold">{messages[0]}</p>
            ) : (
              <ul className="list-disc pl-4 space-y-1">
                {messages.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 text-white/70 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
