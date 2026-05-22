'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CountdownText } from '@/components/countdown'

type Bracket = {
  id: string
  name: string
  points: number
  rank: number | null
  groupPicks: number
  koPicks: number
}

export default function SubmissionsClient({
  initialBrackets,
  locked,
}: {
  initialBrackets: Bracket[]
  locked: boolean
}) {
  const router = useRouter()
  const [brackets, setBrackets] = useState(initialBrackets)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setCreateError('')
    const res = await fetch('/api/brackets/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setCreateError(json.error ?? 'Failed to create')
      setCreating(false)
    } else {
      router.push(`/brackets/${json.id}`)
    }
  }

  async function deleteBracket(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const supabase = createClient()
    await supabase.from('brackets').delete().eq('id', id)
    setBrackets(prev => prev.filter(b => b.id !== id))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {!locked && (
        <div className="bg-gray-100 rounded-xl px-5 py-3 mb-6 text-sm font-semibold text-gray-600 flex items-center gap-2">
          🕐 <CountdownText />
        </div>
      )}

      <h1 className="text-2xl md:text-3xl font-black mb-6 uppercase tracking-tight">Your Submissions</h1>

      {!locked && (
        <form onSubmit={create} className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Submission name (e.g. Rafael FC)"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#cc0000]"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="bg-[#cc0000] text-white font-bold px-5 py-3 rounded-xl hover:bg-[#a00000] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            + NEW SUBMISSION
          </button>
        </form>
      )}
      {createError && <p className="text-red-600 text-sm mb-4">{createError}</p>}

      {brackets.length === 0 ? (
        <p className="text-center text-gray-400 py-20">
          {locked ? 'No submissions.' : 'Create your first submission above.'}
        </p>
      ) : (
        <div className="space-y-4">
          {brackets.map(b => (
            <div key={b.id} className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="font-black text-lg">{b.name}</p>
                {!locked && (
                  <button
                    onClick={() => deleteBracket(b.id, b.name)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Rank</p>
                  <p className="font-black text-xl text-[#cc0000]">
                    {b.rank != null ? `#${b.rank}` : '#—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Points</p>
                  <p className="font-black text-xl text-green-600">{b.points}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Exact</p>
                  <p className="font-black text-xl text-green-600">0</p>
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-3">
                Group: {b.groupPicks}/72 · Knockout: {b.koPicks}/32
              </p>

              <Link
                href={`/brackets/${b.id}`}
                className="block w-full bg-[#cc0000] text-white text-center font-bold py-2.5 rounded-xl hover:bg-[#a00000] transition-colors text-sm uppercase tracking-wide"
              >
                Open Predictions
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
