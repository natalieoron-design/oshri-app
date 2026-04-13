export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MessagesClient from './MessagesClient'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [messagesRes, profileRes, therapistRes] = await Promise.all([
    supabase.from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*').eq('role', 'therapist').single(),
  ])

  // Mark messages as read
  await supabase.from('messages')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  return (
    <MessagesClient
      userId={user.id}
      profile={profileRes.data}
      therapist={therapistRes.data}
      initialMessages={messagesRes.data ?? []}
    />
  )
}
