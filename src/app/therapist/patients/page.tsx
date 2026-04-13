export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PatientsClient from './PatientsClient'

export default async function PatientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [patientsRes, todayDiaryRes, weekWeightRes, detailsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'patient').order('full_name'),
    supabase.from('food_diary').select('patient_id').gte('logged_at', today + 'T00:00:00'),
    supabase.from('weight_logs').select('patient_id, weight, logged_at').gte('logged_at', weekAgo),
    supabase.from('patient_details').select('*'),
  ])

  return (
    <PatientsClient
      therapistId={user.id}
      patients={patientsRes.data ?? []}
      todayLoggers={todayDiaryRes.data?.map(d => d.patient_id) ?? []}
      weekWeighters={weekWeightRes.data?.map(w => w.patient_id) ?? []}
      details={detailsRes.data ?? []}
    />
  )
}
