'use client'
import { useEffect, useState } from 'react'
import { LOCK_AT } from '@/lib/lock'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function useDiff() {
  const [diff, setDiff] = useState(LOCK_AT.getTime() - Date.now())
  useEffect(() => {
    const id = setInterval(() => setDiff(LOCK_AT.getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return diff
}

export function CountdownText() {
  const diff = useDiff()
  if (diff <= 0) return <span>Pool is locked</span>
  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hrs = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  return <span>Bracket locks in {days}d {hrs}h {mins}m</span>
}

export default function Countdown() {
  const diff = useDiff()

  if (diff <= 0) {
    return (
      <p className="text-[#f5c518] font-bold text-lg tracking-widest">
        POOL IS LOCKED · JUNE 11 2026
      </p>
    )
  }

  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hrs = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  return (
    <div className="flex gap-4 justify-center text-center">
      {[
        { v: days, label: 'DAYS' },
        { v: hrs, label: 'HRS' },
        { v: mins, label: 'MIN' },
        { v: secs, label: 'SEC' },
      ].map(({ v, label }) => (
        <div key={label}>
          <div className="text-4xl font-black text-[#f5c518] tabular-nums">{pad(v)}</div>
          <div className="text-xs text-red-200 tracking-widest">{label}</div>
        </div>
      ))}
    </div>
  )
}
