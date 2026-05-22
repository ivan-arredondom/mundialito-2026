'use client'
import { useEffect, useState } from 'react'

export default function LocalTime({ utc }: { utc: string }) {
  const [label, setLabel] = useState<string>('')

  useEffect(() => {
    setLabel(
      new Date(utc).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    )
  }, [utc])

  // Show UTC as fallback during SSR to avoid hydration mismatch
  if (!label) {
    return (
      <span>
        {new Date(utc).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        })}{' '}
        UTC
      </span>
    )
  }

  return <span>{label}</span>
}
