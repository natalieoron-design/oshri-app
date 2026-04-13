import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', req.url))

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') return NextResponse.redirect(new URL('/dashboard', req.url))

  const mode = req.nextUrl.searchParams.get('mode') // 'patient' | 'therapist'
  const redirectTo = mode === 'patient' ? '/dashboard' : '/therapist'

  const res = NextResponse.redirect(new URL(redirectTo, req.url))

  if (mode === 'patient') {
    res.cookies.set('patient_view_mode', '1', { path: '/', maxAge: 60 * 60 * 8, httpOnly: false })
  } else {
    res.cookies.delete('patient_view_mode')
  }

  return res
}
