import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Navbar from './Navbar'
import { ToastProvider } from '@/components/ui/Toast'
import { Profile } from '@/lib/types'

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
  const patientViewId = cookieStore.get('patient_view_id')?.value ?? null

  // Fetch patient list for the therapist's patient picker
  let patients: Profile[] = []
  if (profile.role === 'therapist') {
    const admin = createAdminClient()
    const { data: detailRows } = await admin.from('patient_details').select('patient_id')
    const ids = detailRows?.map(r => r.patient_id) ?? []
    if (ids.length > 0) {
      const { data } = await admin.from('profiles').select('id,full_name,email,role,avatar_url,phone,created_at').in('id', ids)
      patients = (data ?? []) as Profile[]
    }
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f5f0e8]">
        <Navbar
          profile={profile}
          patientViewMode={patientViewMode}
          patientViewId={patientViewId}
          patients={patients}
        />
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
