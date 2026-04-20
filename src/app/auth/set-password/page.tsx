'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 'loading' while we check/establish session, 'ready' when form can show, 'invalid' on bad token
  const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // First check if we already have a session (set by /auth/confirm via cookies)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setStatus('ready')
        return
      }

      // Fallback: handle implicit flow — Supabase redirected here with hash fragments
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.slice(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        if (accessToken && refreshToken && (type === 'invite' || type === 'recovery')) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!sessionErr) {
            // Clear the hash from the URL without triggering a reload
            window.history.replaceState(null, '', window.location.pathname)
            setStatus('ready')
            return
          }
        }
      }

      // No session and no usable token — token is expired or link was already used
      setStatus('invalid')
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות')
      return
    }
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }
    setLoading(true)
    setError('')

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (status === 'loading') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="text-[#4a7c59] text-lg font-medium">טוען...</div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e0d0] w-full max-w-md p-8 text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">הקישור פג תוקף</h1>
          <p className="text-sm text-gray-500 mb-6">
            קישור הגדרת הסיסמה כבר שומש או שפג תוקפו.<br />
            בקשי מהמטפלת שלך לשלוח הזמנה חדשה.
          </p>
          <a
            href="/auth/login"
            className="inline-block bg-[#4a7c59] text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-[#3d6b4a] transition-colors text-sm"
          >
            חזרה לדף הכניסה
          </a>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e0d0] w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-[#4a7c59] mb-1">אושרי הרץ</div>
          <div className="text-sm text-gray-400">נטורופתית N.D · רפואה משלימה</div>
        </div>

        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🌿</div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">בחרי סיסמה</h1>
          <p className="text-sm text-gray-500">הגדירי סיסמה כדי להיכנס לאפליקציה</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">סיסמה חדשה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">אימות סיסמה</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="הזיני שוב את הסיסמה"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full bg-[#4a7c59] text-white font-semibold py-3 rounded-xl hover:bg-[#3d6b4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'שומרת...' : 'כניסה לאפליקציה ✨'}
          </button>
        </form>
      </div>
    </div>
  )
}
