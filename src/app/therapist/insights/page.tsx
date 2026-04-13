export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InsightsClient from './InsightsClient'

export default async function TherapistInsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') redirect('/dashboard')

  const [insightsRes, patientsRes] = await Promise.all([
    supabase.from('ai_insights')
      .select('*, profiles!ai_insights_patient_id_fkey(full_name)')
      .order('generated_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name').eq('role', 'patient'),
  ])

  return (
    <InsightsClient
      therapistId={user.id}
      initialInsights={insightsRes.data ?? []}
      patients={patientsRes.data ?? []}
    />
  )
}
