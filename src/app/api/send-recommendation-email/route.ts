import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewRecommendationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { patientEmail, patientName, recommendationCount } = await req.json()
  if (!patientEmail || !patientName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  console.log('[send-recommendation-email] RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length ?? 'undefined', '| starts with re_:', process.env.RESEND_API_KEY?.startsWith('re_'))

  if (!process.env.RESEND_API_KEY) {
    console.warn('[send-recommendation-email] RESEND_API_KEY not set, skipping email')
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    const result = await sendNewRecommendationEmail({
      patientEmail,
      patientName,
      recommendationCount: recommendationCount ?? 1,
    })
    console.log('[send-recommendation-email] Resend result:', JSON.stringify(result))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-recommendation-email] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
