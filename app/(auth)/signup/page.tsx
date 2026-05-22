'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [groupCode, setGroupCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    // Check registrations are open
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('allow_registrations')
      .single()
    if (appSettings && !appSettings.allow_registrations) {
      setError('Registrations are currently closed.')
      setLoading(false)
      return
    }

    // Validate group code and check capacity (server-side to bypass RLS)
    const groupRes = await fetch('/api/auth/validate-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: groupCode.trim() }),
    })
    if (!groupRes.ok) {
      const { error } = await groupRes.json()
      setError(error)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name, group_code: groupCode.trim() } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-3xl font-black mb-2">Join the pool</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-[#cc0000] font-semibold">
          Log in
        </Link>
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Display name" value={name} onChange={setName} type="text" required />
        <Field label="Email" value={email} onChange={setEmail} type="email" required />
        <PasswordField label="Password" value={password} onChange={setPassword} required />
        <Field label="Group code" value={groupCode} onChange={setGroupCode} type="text" required />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#cc0000] text-white font-bold py-3 rounded-lg hover:bg-[#a00000] transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#cc0000]"
      />
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#cc0000]"
        />
        <button
          type="button"
          onMouseDown={() => setShow(true)}
          onMouseUp={() => setShow(false)}
          onMouseLeave={() => setShow(false)}
          onTouchStart={() => setShow(true)}
          onTouchEnd={() => setShow(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 select-none"
          aria-label="Hold to show password"
        >
          {show ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>
    </div>
  )
}
