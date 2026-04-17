export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PatientsClient from './PatientsClient'
import { Profile } from '@/lib/types'

export default async function PatientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [patientsRes, todayDiaryRes, weekWeightRes, detailsRes] = await Promise.all([
    // Include all profiles that have a patient_details entry (covers therapist-as-patient too)
    supabase.from('patient_details').select('patient_id, profiles(*)').order('patient_id'),
    supabase.from('food_diary').select('patient_id').gte('logged_at', today + 'T00:00:00'),
    supabase.from('weight_logs').select('patient_id, weight, logged_at').gte('logged_at', weekAgo),
    supabase.from('patient_details').select('*'),
  ])

  // Extract profiles from the patient_details join, sorted by name
  const patients = ((patientsRes.data ?? [])
    .map((row: Record<string, unknown>) => row.profiles)
    .filter(Boolean) as Profile[])
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he'))

  return (
    <PatientsClient
      therapistId={user.id}
      patients={patients}
      todayLoggers={todayDiaryRes.data?.map(d => d.patient_id) ?? []}
      weekWeighters={weekWeightRes.data?.map(w => w.patient_id) ?? []}
      details={detailsRes.data ?? []}
    />
  )
}
