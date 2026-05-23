'use client'
import { useState, useEffect } from 'react'

type Platform = 'ios' | 'android' | 'other'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

const iosSteps = [
  {
    icon: (
      <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" strokeWidth={1.75} strokeLinecap="round" />
      </svg>
    ),
    text: 'Tap the Share button at the bottom of Safari',
  },
  {
    icon: (
      <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.75} />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.75} />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.75} />
        <path d="M14 17.5h7M17.5 14v7" strokeWidth={1.75} strokeLinecap="round" />
      </svg>
    ),
    text: 'Scroll down and tap "Add to Home Screen"',
  },
  {
    icon: (
      <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M5 12l5 5L20 7" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    text: 'Tap "Add" in the top right corner',
  },
]

const androidSteps = [
  {
    icon: (
      <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="19" r="1.5" fill="currentColor" />
      </svg>
    ),
    text: 'Tap the ⋮ menu in the top right of Chrome',
  },
  {
    icon: (
      <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.75} />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.75} />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.75} />
        <path d="M14 17.5h7M17.5 14v7" strokeWidth={1.75} strokeLinecap="round" />
      </svg>
    ),
    text: 'Tap "Add to Home screen" or "Install app"',
  },
  {
    icon: (
      <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M5 12l5 5L20 7" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    text: 'Tap "Add" to confirm',
  },
]

export default function InstallGuide() {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  if (platform === 'other') return null

  const steps = platform === 'ios' ? iosSteps : androidSteps

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 text-gray-400 transition-colors hover:text-gray-600"
        aria-label="Add to home screen"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="14" width="18" height="7" rx="2" strokeWidth={1.75} />
        </svg>
        <span className="text-[10px] font-medium leading-tight">Install</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setOpen(false)}>
          <div
            className="w-full bg-white rounded-t-2xl shadow-2xl p-6 pb-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

            <h2 className="text-lg font-black mb-1">Add to Home Screen</h2>
            <p className="text-sm text-gray-500 mb-6">
              Install Mundialito as an app for quick access.
            </p>

            <ol className="space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#cc0000]/10 text-[#cc0000] font-black text-xs shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{step.icon}</span>
                    <span className="text-sm text-gray-700">{step.text}</span>
                  </div>
                </li>
              ))}
            </ol>

            <button
              onClick={() => setOpen(false)}
              className="mt-8 w-full bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
