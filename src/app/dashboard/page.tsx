export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import { formatWeight } from '@/lib/utils'

export default async function PatientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const admin = createAdminClient()

  const [profileRes, weightRes, diaryRes, waterRes, messagesRes, insightsRes, detailsRes, goalsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('weight_logs').select('*').eq('patient_id', user.id).order('logged_at', { ascending: false }).limit(5),
    supabase.from('food_diary').select('*').eq('patient_id', user.id).gte('logged_at', weekAgo + 'T00:00:00').order('logged_at', { ascending: false }),
    supabase.from('water_intake').select('*').eq('patient_id', user.id).eq('date', today).single(),
    supabase.from('messages').select('*').eq('recipient_id', user.id).eq('is_read', false),
    supabase.from('ai_insights').select('*').eq('patient_id', user.id).eq('status', 'approved').order('generated_at', { ascending: false }).limit(3),
    supabase.from('patient_details').select('*').eq('patient_id', user.id).single(),
    admin.from('treatment_goals').select('*').eq('patient_id', user.id).order('created_at', { ascending: true }),
  ])

  const profile = profileRes.data
  const weights = weightRes.data ?? []
  const diary = diaryRes.data ?? []
  const water = waterRes.data
  const unreadMessages = messagesRes.data?.length ?? 0
  const insights = insightsRes.data ?? []
  const details = detailsRes.data
  const goals = goalsRes.data ?? []

  // Weekly nutrition totals
  const todayEntries = diary.filter(e => e.logged_at.startsWith(today))
  const todayCalories = todayEntries.reduce((s, e) => s + (e.calories ?? 0), 0)
  const todayProtein = todayEntries.reduce((s, e) => s + (e.protein ?? 0), 0)
  const todayCarbs = todayEntries.reduce((s, e) => s + (e.carbs ?? 0), 0)
  const todayFat = todayEntries.reduce((s, e) => s + (e.fat ?? 0), 0)

  const latestWeight = weights[0]
  const prevWeight = weights[1]
  const weightChange = latestWeight && prevWeight
    ? (latestWeight.weight - prevWeight.weight)
    : null

  const waterGoal = details?.daily_water_goal ?? 8
  const calorieGoal = details?.daily_calorie_goal ?? 2000
  const currentCups = water?.cups ?? 0

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-[#4a7c59]">
          שלום {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Alert messages */}
      {unreadMessages > 0 && (
        <Link href="/messages">
          <div className="bg-[#4a7c59] text-white rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#3d6849] transition-colors">
            <div>
              <p className="font-semibold">הודעות חדשות מהמטפלת</p>
              <p className="text-sm text-white/80">{unreadMessages} הודעות לא נקראו</p>
            </div>
            <span className="text-2xl">💬</span>
          </div>
        </Link>
      )}

      {/* Today Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-[#4a7c59]">{Math.round(todayCalories)}</div>
          <div className="text-xs text-gray-500 mt-1">קלוריות היום</div>
          <div className="text-xs text-[#6a9e78] mt-1">מתוך {calorieGoal}</div>
          <div className="w-full bg-[#c8dece]/50 rounded-full h-1.5 mt-2">
            <div
              className="bg-[#4a7c59] h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (todayCalories / calorieGoal) * 100)}%` }}
            />
          </div>
        </Card>

        <Card className="text-center">
          <div className="text-3xl font-bold text-[#4a7c59]">{currentCups}</div>
          <div className="text-xs text-gray-500 mt-1">כוסות מים</div>
          <div className="text-xs text-[#6a9e78] mt-1">מתוך {waterGoal}</div>
          <div className="w-full bg-[#c8dece]/50 rounded-full h-1.5 mt-2">
            <div
              className="bg-[#6a9e78] h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (currentCups / waterGoal) * 100)}%` }}
            />
          </div>
        </Card>

        <Card className="text-center">
          <div className="text-3xl font-bold text-[#4a7c59]">{Math.round(todayProtein)}g</div>
          <div className="text-xs text-gray-500 mt-1">חלבון</div>
          <div className="text-xs text-gray-400 mt-1">{Math.round(todayCarbs)}g פחמ׳</div>
        </Card>

        <Card className="text-center">
          {latestWeight ? (
            <>
              <div className="text-3xl font-bold text-[#4a7c59]">{latestWeight.weight}</div>
              <div className="text-xs text-gray-500 mt-1">משקל אחרון (ק"ג)</div>
              {weightChange !== null && (
                <div className={`text-xs mt-1 font-medium ${weightChange < 0 ? 'text-green-600' : weightChange > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {weightChange < 0 ? '▼' : weightChange > 0 ? '▲' : '→'} {Math.abs(weightChange).toFixed(1)}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-3xl">⚖️</div>
              <div className="text-xs text-gray-500 mt-1">לא נרשם משקל</div>
            </>
          )}
        </Card>
      </div>

      {/* Macro breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>תזונה של היום</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'פחמימות', value: todayCarbs, color: '#6a9e78', unit: 'g' },
            { label: 'חלבון', value: todayProtein, color: '#4a7c59', unit: 'g' },
            { label: 'שומן', value: todayFat, color: '#c8dece', unit: 'g' },
          ].map(macro => (
            <div key={macro.label}>
              <div className="text-xl font-bold" style={{ color: macro.color }}>
                {Math.round(macro.value)}{macro.unit}
              </div>
              <div className="text-xs text-gray-500">{macro.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link href="/diary" className="text-sm text-[#4a7c59] font-medium hover:underline">
            עבור ליומן תזונה ←
          </Link>
        </div>
      </Card>

      {/* Treatment Goals */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>המטרות שלי 🎯</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {goals.map(goal => (
              <div key={goal.id} className="flex items-start gap-3 bg-[#f5f0e8] rounded-xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-[#4a7c59] mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-[#4a7c59] block mb-0.5">{goal.category}</span>
                  <span className="text-sm text-gray-700">{goal.goal_text}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/diary', icon: '🍽️', label: 'רשום ארוחה' },
          { href: '/weight', icon: '⚖️', label: 'רשום משקל' },
          { href: '/recommendations', icon: '📋', label: 'המלצות' },
          { href: '/shop', icon: '🛍️', label: 'חנות' },
        ].map(action => (
          <Link key={action.href} href={action.href}>
            <Card className="text-center hover:border-[#4a7c59]/30 transition-all">
              <div className="text-3xl mb-2">{action.icon}</div>
              <div className="text-sm font-medium text-gray-700">{action.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>תובנות מהמטפלת</CardTitle>
              <Badge variant="green">מאושר</Badge>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {insights.map(insight => (
              <div key={insight.id} className="bg-[#f5f0e8] rounded-xl p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{insight.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(insight.generated_at).toLocaleDateString('he-IL')}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Weight goal */}
      {details?.goal_weight && latestWeight && (
        <Card>
          <CardHeader>
            <CardTitle>יעד משקל</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">משקל נוכחי</div>
              <div className="text-lg font-bold text-[#4a7c59]">{formatWeight(latestWeight.weight)}</div>
            </div>
            <div className="text-2xl">→</div>
            <div className="text-left">
              <div className="text-sm text-gray-500">יעד</div>
              <div className="text-lg font-bold text-[#6a9e78]">{formatWeight(details.goal_weight)}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>נותר: {Math.abs(latestWeight.weight - details.goal_weight).toFixed(1)} ק"ג</span>
              <span>{Math.round(Math.min(100, (details.goal_weight / latestWeight.weight) * 100))}%</span>
            </div>
            <div className="w-full bg-[#c8dece]/50 rounded-full h-2">
              <div
                className="bg-[#4a7c59] h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (details.goal_weight / latestWeight.weight) * 100)}%` }}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
