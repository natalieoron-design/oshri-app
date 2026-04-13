export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TherapistMessagesClient from './TherapistMessagesClient'

export default async function TherapistMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') redirect('/dashboard')

  const [patientsRes, messagesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'patient').order('full_name'),
    supabase.from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  // Mark messages to therapist as read
  await supabase.from('messages').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false)

  return (
    <TherapistMessagesClient
      therapistId={user.id}
      patients={patientsRes.data ?? []}
      initialMessages={messagesRes.data ?? []}
    />
  )
}
