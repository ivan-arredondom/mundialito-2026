'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function JoinGroupPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Make sure user is still logged in
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const res = await fetch('/api/auth/join-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Join a group</h1>
        <p className="text-gray-500 text-sm">
          You&apos;re not currently in a group. Enter the invite code your admin shared with you to continue.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Group code</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
            autoFocus
            placeholder="e.g. SanDiego"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#cc0000]"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !code}
          className="w-full bg-[#cc0000] text-white font-bold py-3 rounded-lg hover:bg-[#a00000] transition-colors disabled:opacity-50"
        >
          {loading ? 'Joining…' : 'Join group'}
        </button>
      </form>
    </div>
  )
}
