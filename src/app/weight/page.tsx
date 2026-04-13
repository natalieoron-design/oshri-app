export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WeightClient from './WeightClient'

export default async function WeightPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [weightRes, detailsRes] = await Promise.all([
    supabase.from('weight_logs').select('*').eq('patient_id', user.id).order('logged_at', { ascending: true }),
    supabase.from('patient_details').select('*').eq('patient_id', user.id).single(),
  ])

  return (
    <WeightClient
      userId={user.id}
      initialLogs={weightRes.data ?? []}
      details={detailsRes.data}
    />
  )
}
