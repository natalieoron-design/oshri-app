'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('אימייל או סיסמה שגויים')
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'therapist') {
        router.push('/therapist')
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[#4a7c59] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="text-2xl font-bold text-[#4a7c59]">אושרי הרץ</h1>
        <p className="text-gray-500 text-sm mt-1">רפואה משלימה</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#c8dece]/50 p-8 w-full max-w-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">כניסה למערכת</h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label="אימייל"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
          <Input
            label="סיסמה"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
            כניסה
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          הצטרפות למערכת דרך קישור שנשלח מהמטפלת בלבד
        </p>
      </div>
    </div>
  )
}
