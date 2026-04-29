export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import PatientsClient from './PatientsClient'
import { Profile, TreatmentGoal } from '@/lib/types'

export default async function PatientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  // Step 1: get all patient IDs from patient_details
  const { data: detailsData } = await supabase.from('patient_details').select('*')
  const patientIds = detailsData?.map(r => r.patient_id) ?? []

  const admin = createAdminClient()

  const [patientsRes, todayDiaryRes, weekWeightRes, goalsRes] = await Promise.all([
    patientIds.length > 0
      ? supabase.from('profiles').select('*').in('id', patientIds)
      : Promise.resolve({ data: [] }),
    supabase.from('food_diary').select('patient_id').gte('logged_at', today + 'T00:00:00'),
    supabase.from('weight_logs').select('patient_id, weight, logged_at').gte('logged_at', weekAgo),
    patientIds.length > 0
      ? admin.from('treatment_goals').select('*').in('patient_id', patientIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const detailsRes = { data: detailsData ?? [] }

  const patients = ((patientsRes.data ?? []) as Profile[])
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he'))

  return (
    <PatientsClient
      therapistId={user.id}
      patients={patients}
      todayLoggers={todayDiaryRes.data?.map(d => d.patient_id) ?? []}
      weekWeighters={weekWeightRes.data?.map(w => w.patient_id) ?? []}
      details={detailsRes.data ?? []}
      initialGoals={(goalsRes.data ?? []) as TreatmentGoal[]}
    />
  )
}
