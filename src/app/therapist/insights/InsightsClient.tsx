'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AiInsight } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

interface InsightWithPatient extends AiInsight {
  profiles?: { full_name: string }
}

interface Props {
  therapistId: string
  initialInsights: InsightWithPatient[]
  patients: { id: string; full_name: string }[]
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected'

export default function InsightsClient({ therapistId, initialInsights, patients }: Props) {
  const [insights, setInsights] = useState<InsightWithPatient[]>(initialInsights)
  const [filter, setFilter] = useState<Filter>('pending')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [genPrompt, setGenPrompt] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const filtered = insights.filter(i =>
    filter === 'all' ? true : i.status === filter
  )

  const updateInsight = async (id: string, status: 'approved' | 'rejected') => {
    setLoading(id)
    try {
      const { error } = await supabase.from('ai_insights').update({
        status,
        therapist_notes: notes[id] || null,
        reviewed_by: therapistId,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id)

      if (error) throw error

      setInsights(prev => prev.map(i => i.id === id ? { ...i, status, therapist_notes: notes[id] || null } : i))
      showToast(status === 'approved' ? 'תובנה אושרה ✓' : 'תובנה נדחתה', status === 'approved' ? 'success' : 'info')
    } catch {
      showToast('שגיאה', 'error')
    } finally {
      setLoading(null)
    }
  }

  const generateMenuSuggestion = async () => {
    if (!selectedPatient) return
    setGenLoading(true)
    try {
      const res = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatient, prompt: genPrompt }),
      })
      const data = await res.json()

      const { data: insight, error } = await supabase.from('ai_insights').insert({
        patient_id: selectedPatient,
        content: data.menu,
        insight_type: 'menu',
        status: 'pending',
      }).select('*, profiles!ai_insights_patient_id_fkey(full_name)').single()

      if (error) throw error
      setInsights(prev => [insight, ...prev])
      setShowGenerate(false)
      setGenPrompt('')
      showToast('הצעת תפריט נוצרה ומחכה לאישור', 'success')
    } catch {
      showToast('שגיאה ביצירת תפריט', 'error')
    } finally {
      setGenLoading(false)
    }
  }

  const statusLabel: Record<string, string> = { pending: 'ממתין', approved: 'מאושר', rejected: 'נדחה' }
  const statusBadge: Record<string, 'yellow' | 'green' | 'red'> = { pending: 'yellow', approved: 'green', rejected: 'red' }
  const typeLabel: Record<string, string> = { nutrition: 'תזונה', menu: 'תפריט', recipe: 'מתכון', general: 'כללי' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#4a7c59]">תובנות AI 🤖</h1>
        <Button onClick={() => setShowGenerate(!showGenerate)} variant="secondary">
          ✨ צור הצעת תפריט
        </Button>
      </div>

      {/* Generate menu panel */}
      {showGenerate && (
        <Card className="border-[#4a7c59]/30 border-2">
          <CardHeader><CardTitle>יצירת הצעת תפריט</CardTitle></CardHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">בחר מטופל</label>
              <select
                value={selectedPatient}
                onChange={e => setSelectedPatient(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
              >
                <option value="">בחר מטופל...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">הוראות מיוחדות (אופציונלי)</label>
              <textarea
                value={genPrompt}
                onChange={e => setGenPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] resize-none h-24 text-sm"
                placeholder="לדוגמה: תפריט ללא גלוטן לשבוע, 1800 קלוריות ביום..."
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={generateMenuSuggestion} loading={genLoading}>✨ צור תפריט</Button>
              <Button variant="outline" onClick={() => setShowGenerate(false)}>ביטול</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-[#c8dece]/50 gap-1">
        {(['pending', 'all', 'approved', 'rejected'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              filter === f ? 'bg-[#4a7c59] text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'all' ? 'הכל' : f === 'pending' ? `ממתין (${insights.filter(i => i.status === 'pending').length})` : f === 'approved' ? 'מאושר' : 'נדחה'}
          </button>
        ))}
      </div>

      {/* Insights list */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🤖</div>
            <p>אין תובנות {filter !== 'all' ? statusLabel[filter] : ''}</p>
          </div>
        ) : (
          filtered.map(insight => (
            <Card key={insight.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">
                      {insight.profiles?.full_name ?? 'מטופל'}
                    </span>
                    <Badge variant={statusBadge[insight.status]}>{statusLabel[insight.status]}</Badge>
                    <Badge variant="gray">{typeLabel[insight.insight_type]}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(insight.generated_at).toLocaleString('he-IL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="bg-[#f5f0e8] rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{insight.content}</p>
              </div>

              {insight.status === 'pending' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">הערה למטופל (אופציונלי)</label>
                    <textarea
                      value={notes[insight.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [insight.id]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] resize-none h-16 text-sm"
                      placeholder="הוסף הערה שתוצג למטופל..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={loading === insight.id}
                      onClick={() => updateInsight(insight.id, 'approved')}
                    >
                      ✓ אשר
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={loading === insight.id}
                      onClick={() => updateInsight(insight.id, 'rejected')}
                    >
                      ✗ דחה
                    </Button>
                  </div>
                </div>
              )}

              {insight.therapist_notes && (
                <div className="mt-3 bg-[#c8dece]/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-[#4a7c59] mb-1">הערתך:</p>
                  <p className="text-sm text-gray-600">{insight.therapist_notes}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
