export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiaryClient from './DiaryClient'

export default async function DiaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'therapist') redirect('/therapist')

  const today = new Date().toISOString().split('T')[0]

  const [diaryRes, waterRes, insightsRes, detailsRes] = await Promise.all([
    supabase.from('food_diary').select('*').eq('patient_id', user.id).gte('logged_at', today + 'T00:00:00').order('logged_at', { ascending: false }),
    supabase.from('water_intake').select('*').eq('patient_id', user.id).eq('date', today).single(),
    supabase.from('ai_insights').select('*').eq('patient_id', user.id).eq('status', 'approved').order('generated_at', { ascending: false }),
    supabase.from('patient_details').select('*').eq('patient_id', user.id).single(),
  ])

  return (
    <DiaryClient
      userId={user.id}
      initialEntries={diaryRes.data ?? []}
      initialWater={waterRes.data}
      insights={insightsRes.data ?? []}
      details={detailsRes.data}
      today={today}
    />
  )
}
