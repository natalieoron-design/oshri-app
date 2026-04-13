import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Navbar from './Navbar'
import { ToastProvider } from '@/components/ui/Toast'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const cookieStore = await cookies()
  const patientViewMode = profile.role === 'therapist' && cookieStore.get('patient_view_mode')?.value === '1'

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f5f0e8]">
        <Navbar profile={profile} patientViewMode={patientViewMode} />
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
