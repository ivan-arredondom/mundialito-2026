'use client'
import { useState, useEffect, useRef } from 'react'

type Props = { groupName: string; groupCode: string }

const SITE = 'https://mundialito-2026.vercel.app'

export default function ShareGroupButton({ groupName, groupCode }: Props) {
  const [open, setOpen] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const url = `${SITE}/signup?code=${groupCode}`

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  async function copyCode() {
    await navigator.clipboard.writeText(groupCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 1200)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 1200)
  }

  function shareOrCopy() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Join my Mundialito pool',
        text: `Join "${groupName}" on Mundialito — code ${groupCode}`,
        url,
      }).catch(() => {})
    } else {
      copyLink()
    }
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent('Join my Mundialito pool')}&body=${encodeURIComponent(`Join "${groupName}" on Mundialito — use code ${groupCode} at signup.\n\n${url}`)}`

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-label={`Share ${groupName} invite code`}
        className="flex items-center gap-1.5 border-[1.5px] border-[#cc0000] text-[#cc0000] bg-white rounded-full px-3 py-1 text-xs md:text-sm font-bold transition-colors hover:bg-[#cc0000] hover:text-white"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`Invite to ${groupName}`}
        >
          <div className="absolute inset-0 bg-black/40" />

          <div
            className="relative w-full bg-white rounded-t-2xl shadow-2xl p-6 pb-10 md:rounded-2xl md:max-w-sm md:pb-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle — mobile only */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6 md:hidden" />

            <h2 className="text-lg font-black mb-1">Invite to {groupName}</h2>
            <p className="text-sm text-gray-500 mb-5">
              Anyone with this code can join your group at signup.
            </p>

            {/* Code block */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-0.5">
                  Invite Code
                </p>
                <p className="font-black text-[22px] leading-tight tracking-widest font-mono">
                  {groupCode}
                </p>
              </div>
              <button
                onClick={copyCode}
                className="ml-4 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-700 shrink-0"
              >
                {codeCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Link row */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 mb-5">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" />
              </svg>
              <span className="text-xs text-gray-500 truncate flex-1">
                {SITE}/signup?code={groupCode}
              </span>
              <button
                onClick={copyLink}
                className="text-xs font-semibold text-[#cc0000] shrink-0 hover:underline"
              >
                {linkCopied ? 'Copied!' : 'Copy link'}
              </button>
            </div>

            {/* Screen-reader copy announcement */}
            <span className="sr-only" aria-live="polite">
              {codeCopied ? 'Code copied' : linkCopied ? 'Link copied' : ''}
            </span>

            {/* Primary action */}
            <div className="hidden md:block">
              <a
                href={mailtoHref}
                className="block w-full bg-[#cc0000] text-white font-bold py-3 rounded-xl text-sm text-center hover:bg-[#a00000] transition-colors"
              >
                Share via email
              </a>
            </div>
            <div className="md:hidden">
              <button
                onClick={shareOrCopy}
                className="w-full bg-[#cc0000] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#a00000] transition-colors"
              >
                Share via…
              </button>
            </div>

            <button
              onClick={close}
              className="mt-3 w-full bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
