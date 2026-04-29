export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { RECOMMENDATION_TYPES } from '@/lib/types'
import { getViewPatientId } from '@/lib/patient-view'

export default async function RecommendationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const patientId = await getViewPatientId(user.id)

  const { data: recommendations } = await supabase
    .from('recommendations')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const grouped = {
    nutrition: recommendations?.filter(r => r.type === 'nutrition') ?? [],
    supplement: recommendations?.filter(r => r.type === 'supplement') ?? [],
    exercise: recommendations?.filter(r => r.type === 'exercise') ?? [],
    general: recommendations?.filter(r => r.type === 'general') ?? [],
  }

  const typeIcons = {
    nutrition: '🥗',
    supplement: '💊',
    exercise: '🏃',
    general: '💡',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#4a7c59]">המלצות המטפלת 📋</h1>

      {!recommendations?.length && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-500">אין המלצות עדיין</p>
          <p className="text-sm text-gray-400 mt-1">המטפלת תוסיף המלצות בקרוב</p>
        </div>
      )}

      {(Object.entries(grouped) as [keyof typeof grouped, typeof grouped.nutrition][]).map(([type, recs]) => {
        if (recs.length === 0) return null
        return (
          <div key={type}>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>{typeIcons[type]}</span>
              {RECOMMENDATION_TYPES[type]}
            </h2>
            <div className="space-y-3">
              {recs.map(rec => (
                <Card key={rec.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#c8dece] rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                      {typeIcons[type as keyof typeof typeIcons]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-800">{rec.title}</h3>
                        <Badge variant="green">{RECOMMENDATION_TYPES[type]}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{rec.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(rec.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
