'use client'
import { useEffect, useState } from 'react'

export default function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (status === 'saved') {
      setShow(true)
      const t = setTimeout(() => setShow(false), 2000)
      return () => clearTimeout(t)
    }
  }, [status])

  if (status === 'saving') return <span className="text-xs text-gray-400">Saving…</span>
  if (show) return <span className="text-xs text-green-600 font-semibold">Saved ✓</span>
  return null
}
