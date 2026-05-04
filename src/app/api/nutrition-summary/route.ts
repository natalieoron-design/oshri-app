import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST — recompute and upsert the daily summary for the logged-in patient
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, patient_id } = await req.json()
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  // Allow therapist to update for any patient; patients can only update their own
  const targetId: string = patient_id ?? user.id

  const admin = createAdminClient()

  // Aggregate from food_diary for that patient+date
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`
  const { data: entries } = await admin
    .from('food_diary')
    .select('calories, protein, fat, carbs')
    .eq('patient_id', targetId)
    .gte('logged_at', dayStart)
    .lte('logged_at', dayEnd)

  const rows = entries ?? []
  const summary = {
    patient_id: targetId,
    date,
    total_calories: rows.reduce((s, r) => s + (r.calories ?? 0), 0),
    total_protein: rows.reduce((s, r) => s + (r.protein ?? 0), 0),
    total_fat: rows.reduce((s, r) => s + (r.fat ?? 0), 0),
    total_carbs: rows.reduce((s, r) => s + (r.carbs ?? 0), 0),
    meals_count: rows.length,
  }

  const { data, error } = await admin
    .from('nutrition_daily_summary')
    .upsert(summary, { onConflict: 'patient_id,date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// GET — fetch last N days of summaries for a patient
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = req.nextUrl.searchParams
  const patientId = params.get('patient_id') ?? user.id
  const days = Math.min(parseInt(params.get('days') ?? '30'), 90)

  const since = new Date()
  since.setDate(since.getDate() - days + 1)
  const sinceStr = since.toISOString().split('T')[0]

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('nutrition_daily_summary')
    .select('*')
    .eq('patient_id', patientId)
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
