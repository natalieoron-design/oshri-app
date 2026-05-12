export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import WeightClient from './WeightClient'
import { getViewPatientId } from '@/lib/patient-view'

export default async function WeightPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const patientId = await getViewPatientId(user.id)
  const admin = createAdminClient()

  const [weightRes, detailsRes] = await Promise.all([
    admin.from('weight_logs').select('*').eq('patient_id', patientId).order('logged_at', { ascending: true }),
    admin.from('patient_details').select('*').eq('patient_id', patientId).single(),
  ])

  return (
    <WeightClient
      key={patientId}
      userId={patientId}
      initialLogs={weightRes.data ?? []}
      details={detailsRes.data}
    />
  )
}
