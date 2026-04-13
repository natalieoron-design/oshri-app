export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PatientProfileClient from './PatientProfileClient'

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') redirect('/dashboard')

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [patientRes, diaryRes, weightRes, recommendationsRes, detailsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('food_diary').select('*').eq('patient_id', id).gte('logged_at', weekAgo + 'T00:00:00').order('logged_at', { ascending: false }),
    supabase.from('weight_logs').select('*').eq('patient_id', id).order('logged_at', { ascending: true }),
    supabase.from('recommendations').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
    supabase.from('patient_details').select('*').eq('patient_id', id).single(),
  ])

  if (!patientRes.data) redirect('/therapist/patients')

  return (
    <PatientProfileClient
      therapistId={user.id}
      patient={patientRes.data}
      diary={diaryRes.data ?? []}
      weightLogs={weightRes.data ?? []}
      recommendations={recommendationsRes.data ?? []}
      details={detailsRes.data}
    />
  )
}
