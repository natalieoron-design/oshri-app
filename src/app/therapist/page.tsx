export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'

export default async function TherapistDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [patientsRes, todayDiaryRes, weekWeightRes, pendingInsightsRes, unreadMsgRes, ordersRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'patient'),
    supabase.from('food_diary').select('patient_id').gte('logged_at', today + 'T00:00:00'),
    supabase.from('weight_logs').select('patient_id, weight, logged_at').gte('logged_at', weekAgo),
    supabase.from('ai_insights').select('*').eq('status', 'pending').order('generated_at', { ascending: false }),
    supabase.from('messages').select('*').eq('recipient_id', user.id).eq('is_read', false),
    supabase.from('orders').select('*, profiles(full_name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
  ])

  const patients = patientsRes.data ?? []
  const todayLoggers = new Set(todayDiaryRes.data?.map(d => d.patient_id) ?? [])
  const weekWeighters = new Set(weekWeightRes.data?.map(w => w.patient_id) ?? [])
  const pendingInsights = pendingInsightsRes.data ?? []
  const unreadMessages = unreadMsgRes.data?.length ?? 0
  const pendingOrders = ordersRes.data ?? []

  const loggedToday = patients.filter(p => todayLoggers.has(p.id))
  const notLoggedToday = patients.filter(p => !todayLoggers.has(p.id))
  const didntWeighIn = patients.filter(p => !weekWeighters.has(p.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#4a7c59]">לוח בקרה 🌿</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/therapist/patients">
          <Card className="text-center hover:border-[#4a7c59]/30">
            <div className="text-3xl font-bold text-[#4a7c59]">{patients.length}</div>
            <div className="text-xs text-gray-500 mt-1">מטופלים</div>
          </Card>
        </Link>
        <Card className="text-center">
          <div className="text-3xl font-bold text-green-600">{loggedToday.length}</div>
          <div className="text-xs text-gray-500 mt-1">רשמו היום</div>
        </Card>
        <Card className="text-center">
          <div className={`text-3xl font-bold ${notLoggedToday.length > 0 ? 'text-orange-500' : 'text-[#4a7c59]'}`}>
            {notLoggedToday.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">לא רשמו היום</div>
        </Card>
        <Link href="/therapist/insights">
          <Card className="text-center hover:border-[#4a7c59]/30">
            <div className={`text-3xl font-bold ${pendingInsights.length > 0 ? 'text-orange-500' : 'text-[#4a7c59]'}`}>
              {pendingInsights.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">תובנות ממתינות</div>
          </Card>
        </Link>
      </div>

      {/* Alerts */}
      {(pendingInsights.length > 0 || unreadMessages > 0 || didntWeighIn.length > 0) && (
        <div className="space-y-3">
          {pendingInsights.length > 0 && (
            <Link href="/therapist/insights">
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-orange-700">תובנות AI ממתינות לאישור</p>
                  <p className="text-sm text-orange-600">{pendingInsights.length} תובנות</p>
                </div>
                <span className="text-2xl">🤖</span>
              </div>
            </Link>
          )}
          {unreadMessages > 0 && (
            <Link href="/therapist/messages">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-700">הודעות חדשות</p>
                  <p className="text-sm text-blue-600">{unreadMessages} הודעות לא נקראו</p>
                </div>
                <span className="text-2xl">💬</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Today status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>רשמו ארוחות היום ✅</CardTitle>
          </CardHeader>
          {loggedToday.length === 0 ? (
            <p className="text-gray-400 text-sm">אף מטופל לא רשם עדיין</p>
          ) : (
            <div className="space-y-2">
              {loggedToday.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">{p.full_name}</span>
                  <Badge variant="green">רשם</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>לא רשמו היום ⚠️</CardTitle>
          </CardHeader>
          {notLoggedToday.length === 0 ? (
            <p className="text-green-600 text-sm font-medium">כל המטופלים רשמו!</p>
          ) : (
            <div className="space-y-2">
              {notLoggedToday.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-orange-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">{p.full_name}</span>
                  <Link href={`/therapist/messages?to=${p.id}`}>
                    <Badge variant="yellow">שלח תזכורת</Badge>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Didn't weigh in */}
      {didntWeighIn.length > 0 && (
        <Card>
          <CardHeader><CardTitle>לא שקלו השבוע ⚖️</CardTitle></CardHeader>
          <div className="space-y-2">
            {didntWeighIn.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-orange-50 rounded-xl px-3 py-2">
                <span className="text-sm font-medium text-gray-700">{p.full_name}</span>
                <Badge variant="yellow">לא נרשם</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pending orders */}
      {pendingOrders.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>הזמנות ממתינות 🛍️</CardTitle>
              <Link href="/therapist/shop" className="text-sm text-[#4a7c59] hover:underline">כל ההזמנות</Link>
            </div>
          </CardHeader>
          <div className="space-y-2">
            {pendingOrders.map((order: Record<string, unknown>) => (
              <div key={order.id as string} className="flex items-center justify-between bg-[#f5f0e8] rounded-xl px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{(order.profiles as Record<string, unknown>)?.full_name as string}</span>
                  <span className="text-xs text-gray-400 mr-2">₪{order.total_amount as number}</span>
                </div>
                <Badge variant="yellow">ממתין</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: '/therapist/patients', icon: '👥', label: 'ניהול מטופלים' },
          { href: '/therapist/insights', icon: '🤖', label: 'תובנות AI' },
          { href: '/therapist/messages', icon: '💬', label: 'שליחת הודעות' },
          { href: '/therapist/patients?invite=1', icon: '✉️', label: 'הזמן מטופל' },
          { href: '/therapist/shop', icon: '🛍️', label: 'ניהול חנות' },
        ].map(link => (
          <Link key={link.href} href={link.href}>
            <Card className="text-center hover:border-[#4a7c59]/30 transition-all">
              <div className="text-3xl mb-2">{link.icon}</div>
              <div className="text-sm font-medium text-gray-700">{link.label}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
