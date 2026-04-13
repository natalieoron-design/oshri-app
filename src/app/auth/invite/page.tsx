'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

function InviteContent() {
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tokenData, setTokenData] = useState<{ email?: string; valid: boolean } | null>(null)
  const [checkingToken, setCheckingToken] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const supabase = createClient()

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setTokenData({ valid: false })
        setCheckingToken(false)
        return
      }
      const { data } = await supabase
        .from('invite_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      setTokenData(data ? { email: data.email, valid: true } : { valid: false })
      setCheckingToken(false)
    }
    validateToken()
  }, [token])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenData?.valid || !tokenData.email) return

    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: tokenData.email,
      password,
      options: {
        data: { full_name: fullName, role: 'patient' },
      },
    })

    if (authError || !authData.user) {
      setError(authError?.message || 'שגיאה בהרשמה')
      setLoading(false)
      return
    }

    // Mark token as used
    await supabase
      .from('invite_tokens')
      .update({ used: true })
      .eq('token', token)

    router.push('/dashboard')
  }

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#4a7c59] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!tokenData?.valid) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#c8dece]/50 p-8 text-center max-w-sm">
          <span className="text-4xl">❌</span>
          <h2 className="text-xl font-semibold text-gray-800 mt-4 mb-2">קישור לא תקין</h2>
          <p className="text-gray-500 text-sm">הקישור פג תוקף או כבר נוצל. פנה/י למטפלת לקישור חדש.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[#4a7c59] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="text-2xl font-bold text-[#4a7c59]">ברוך הבא/ה!</h1>
        <p className="text-gray-500 text-sm mt-1">הרשמה למערכת אושרי הרץ</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#c8dece]/50 p-8 w-full max-w-sm">
        <div className="bg-[#c8dece]/30 rounded-lg px-4 py-2 mb-6 text-center">
          <p className="text-sm text-[#4a7c59]">נרשם כ: <strong>{tokenData.email}</strong></p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <Input
            label="שם מלא"
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="ישראל ישראלי"
            required
          />
          <Input
            label="סיסמה"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="לפחות 6 תווים"
            minLength={6}
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
            הרשמה
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#4a7c59] border-t-transparent rounded-full" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}
