export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WeightClient from './WeightClient'
import { getViewPatientId } from '@/lib/patient-view'

export default async function WeightPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const patientId = await getViewPatientId(user.id)

  const [weightRes, detailsRes] = await Promise.all([
    supabase.from('weight_logs').select('*').eq('patient_id', patientId).order('logged_at', { ascending: true }),
    supabase.from('patient_details').select('*').eq('patient_id', patientId).single(),
  ])

  return (
    <WeightClient
      userId={patientId}
      initialLogs={weightRes.data ?? []}
      details={detailsRes.data}
    />
  )
}
