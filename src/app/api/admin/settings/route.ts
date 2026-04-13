import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function assertTherapist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') return null
  return supabase
}

export async function GET() {
  const supabase = await assertTherapist()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('app_settings').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await assertTherapist()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body: { key: string; value: string; label?: string }[] = await req.json()
  const { error } = await supabase.from('app_settings').upsert(
    body.map(s => ({ ...s, updated_at: new Date().toISOString() })),
    { onConflict: 'key' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
