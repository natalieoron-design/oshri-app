export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') redirect('/dashboard')

  const adminClient = createAdminClient()

  // Last 30 days range
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 29)
  const from = thirtyDaysAgo.toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const [
    patientsRes,
    diaryRes,
    weightRes,
    authUsersRes,
    notifRulesRes,
    templatesRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, created_at').eq('role', 'patient'),
    supabase.from('food_diary').select('patient_id, logged_at').gte('logged_at', from + 'T00:00:00'),
    supabase.from('weight_logs').select('patient_id, logged_at').gte('logged_at', from + 'T00:00:00'),
    adminClient.auth.admin.listUsers(),
    supabase.from('notification_rules').select('*').order('created_at', { ascending: false }),
    supabase.from('message_templates').select('*').order('created_at', { ascending: false }),
    supabase.from('app_settings').select('*'),
  ])

  const patients = patientsRes.data ?? []
  const diaryEntries = diaryRes.data ?? []
  const weightEntries = weightRes.data ?? []
  const authUsers = authUsersRes.data?.users ?? []
  const notifRules = notifRulesRes.data ?? []
  const templates = templatesRes.data ?? []
  const settings = settingsRes.data ?? []

  // Build analytics: per-day counts for last 30 days
  const days: { date: string; diary: number; weight: number; logins: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    const diaryCount = new Set(
      diaryEntries
        .filter(e => e.logged_at.startsWith(dateStr))
        .map(e => e.patient_id)
    ).size

    const weightCount = new Set(
      weightEntries
        .filter(e => e.logged_at.startsWith(dateStr))
        .map(e => e.patient_id)
    ).size

    // Count logins per day using last_sign_in_at from auth users
    const loginCount = authUsers.filter(u => {
      if (!u.last_sign_in_at) return false
      return u.last_sign_in_at.startsWith(dateStr)
    }).length

    days.push({
      date: dateStr,
      diary: diaryCount,
      weight: weightCount,
      logins: loginCount,
    })
  }

  // Patient activity summary
  const patientActivity = patients.map(p => {
    const lastDiary = diaryEntries
      .filter(e => e.patient_id === p.id)
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0]
    const lastWeight = weightEntries
      .filter(e => e.patient_id === p.id)
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0]
    const authUser = authUsers.find(u => u.id === p.id)
    return {
      id: p.id,
      name: p.full_name,
      email: p.email,
      joined: p.created_at,
      lastLogin: authUser?.last_sign_in_at ?? null,
      lastDiary: lastDiary?.logged_at ?? null,
      lastWeight: lastWeight?.logged_at ?? null,
      loggedToday: lastDiary?.logged_at?.startsWith(todayStr) ?? false,
    }
  })

  return (
    <AdminClient
      days={days}
      patientActivity={patientActivity}
      totalPatients={patients.length}
      notifRules={notifRules}
      templates={templates}
      settings={settings}
      therapistId={user.id}
    />
  )
}
