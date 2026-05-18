import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST — mark all unseen recommendations as seen for a patient
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { patient_id } = await req.json()
  if (!patient_id) return NextResponse.json({ error: 'Missing patient_id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('recommendations')
    .update({ seen_at: new Date().toISOString() })
    .eq('patient_id', patient_id)
    .eq('is_active', true)
    .is('seen_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
