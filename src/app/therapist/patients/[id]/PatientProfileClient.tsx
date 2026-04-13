'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, FoodEntry, WeightLog, Recommendation, PatientDetails, MEAL_TYPES, RECOMMENDATION_TYPES } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  therapistId: string
  patient: Profile
  diary: FoodEntry[]
  weightLogs: WeightLog[]
  recommendations: Recommendation[]
  details: PatientDetails | null
}

type Tab = 'diary' | 'weight' | 'recommendations' | 'ai'

export default function PatientProfileClient({ therapistId, patient, diary, weightLogs, recommendations: initialRecs, details }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('diary')
  const [recs, setRecs] = useState<Recommendation[]>(initialRecs)
  const [showAddRec, setShowAddRec] = useState(false)
  const [recTitle, setRecTitle] = useState('')
  const [recContent, setRecContent] = useState('')
  const [recType, setRecType] = useState<Recommendation['type']>('nutrition')
  const [recLoading, setRecLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const { showToast } = useToast()
  const supabase = createClient()

  const tabs: { key: Tab; label: string }[] = [
    { key: 'diary', label: 'יומן תזונה' },
    { key: 'weight', label: 'משקל' },
    { key: 'recommendations', label: 'המלצות' },
    { key: 'ai', label: 'ניתוח AI' },
  ]

  const totalCalories = diary.reduce((s, e) => s + (e.calories ?? 0), 0)
  const totalProtein = diary.reduce((s, e) => s + (e.protein ?? 0), 0)
  const latestWeight = weightLogs[weightLogs.length - 1]

  const chartData = weightLogs.map(log => ({
    date: new Date(log.logged_at).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }),
    weight: log.weight,
  }))

  const addRecommendation = async () => {
    if (!recTitle || !recContent) return
    setRecLoading(true)
    try {
      const { data, error } = await supabase.from('recommendations').insert({
        patient_id: patient.id,
        therapist_id: therapistId,
        type: recType,
        title: recTitle,
        content: recContent,
      }).select().single()

      if (error) throw error
      setRecs(prev => [data, ...prev])
      setRecTitle('')
      setRecContent('')
      setShowAddRec(false)
      showToast('המלצה נוספה', 'success')
    } catch {
      showToast('שגיאה בהוספת המלצה', 'error')
    } finally {
      setRecLoading(false)
    }
  }

  const deleteRecommendation = async (id: string) => {
    await supabase.from('recommendations').update({ is_active: false }).eq('id', id)
    setRecs(prev => prev.filter(r => r.id !== id))
    showToast('המלצה הוסרה', 'info')
  }

  const generateAiAnalysis = async () => {
    setAiLoading(true)
    setAiResult('')
    try {
      const res = await fetch('/api/ai-patient-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          patientName: patient.full_name,
          diary: diary.slice(0, 20),
          weightLogs: weightLogs.slice(-5),
          goalWeight: details?.goal_weight,
        }),
      })
      const data = await res.json()
      setAiResult(data.analysis)
    } catch {
      showToast('שגיאה בניתוח AI', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const saveAsInsight = async () => {
    if (!aiResult) return
    await supabase.from('ai_insights').insert({
      patient_id: patient.id,
      content: aiResult,
      insight_type: 'nutrition',
      status: 'pending',
    })
    showToast('נשמר לאישור', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/therapist/patients" className="text-[#4a7c59] hover:underline text-sm">← חזור</Link>
          <div>
            <h1 className="text-2xl font-bold text-[#4a7c59]">{patient.full_name}</h1>
            <p className="text-gray-400 text-sm">{patient.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {details?.goal_weight && (
            <Badge variant="green">יעד: {details.goal_weight} ק"ג</Badge>
          )}
          {latestWeight && (
            <Badge variant="blue">משקל: {latestWeight.weight} ק"ג</Badge>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#4a7c59]">{diary.length}</div>
          <div className="text-xs text-gray-500">ארוחות השבוע</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#4a7c59]">{Math.round(totalCalories / Math.max(1, 7))}</div>
          <div className="text-xs text-gray-500">קק"ל ממוצע ליום</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#4a7c59]">{Math.round(totalProtein / Math.max(1, 7))}g</div>
          <div className="text-xs text-gray-500">חלבון ממוצע ליום</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-[#c8dece]/50 gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 ${
              activeTab === tab.key ? 'bg-[#4a7c59] text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Diary */}
      {activeTab === 'diary' && (
        <div className="space-y-3">
          {diary.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🍽️</div>
              <p>לא נרשמו ארוחות השבוע</p>
            </div>
          ) : (
            diary.map(entry => (
              <Card key={entry.id}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#c8dece] rounded-full flex items-center justify-center text-sm flex-shrink-0">
                    {entry.input_type === 'photo' ? '📷' : entry.input_type === 'voice' ? '🎤' : '✍️'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="green">{MEAL_TYPES[entry.meal_type]}</Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.logged_at).toLocaleString('he-IL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {entry.photo_url && (
                      <img src={entry.photo_url} alt="meal" className="w-full h-32 object-cover rounded-lg mb-2" />
                    )}
                    <p className="text-sm text-gray-700">{entry.description}</p>
                    {entry.calories && (
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>🔥 {Math.round(entry.calories)}</span>
                        <span>💪 {Math.round(entry.protein ?? 0)}g</span>
                        <span>🌾 {Math.round(entry.carbs ?? 0)}g</span>
                        <span>🥑 {Math.round(entry.fat ?? 0)}g</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Weight */}
      {activeTab === 'weight' && (
        <div className="space-y-4">
          {weightLogs.length > 1 && (
            <Card>
              <CardHeader><CardTitle>גרף משקל</CardTitle></CardHeader>
              <div className="h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#c8dece50" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 11 }} unit="ק" />
                    <Tooltip formatter={(v) => [`${v} ק"ג`, 'משקל']} />
                    <Line type="monotone" dataKey="weight" stroke="#4a7c59" strokeWidth={2.5} dot={{ fill: '#4a7c59', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>רשומות משקל</CardTitle></CardHeader>
            {weightLogs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">אין רשומות משקל</p>
            ) : (
              <div className="space-y-2">
                {[...weightLogs].reverse().map(log => (
                  <div key={log.id} className="flex items-center justify-between bg-[#f5f0e8] rounded-xl px-3 py-2">
                    <span className="font-medium text-[#4a7c59]">{log.weight} ק"ג</span>
                    <span className="text-sm text-gray-400">{new Date(log.logged_at).toLocaleDateString('he-IL')}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <Button onClick={() => setShowAddRec(!showAddRec)}>+ הוסף המלצה</Button>

          {showAddRec && (
            <Card className="border-[#4a7c59]/30 border-2">
              <CardHeader><CardTitle>המלצה חדשה</CardTitle></CardHeader>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(RECOMMENDATION_TYPES) as [Recommendation['type'], string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setRecType(key)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        recType === key ? 'bg-[#4a7c59] text-white' : 'bg-[#c8dece]/50 text-gray-600 hover:bg-[#c8dece]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Input
                  label="כותרת"
                  value={recTitle}
                  onChange={e => setRecTitle(e.target.value)}
                  placeholder="כותרת ההמלצה"
                />
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">תוכן</label>
                  <textarea
                    value={recContent}
                    onChange={e => setRecContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] resize-none h-32 text-sm"
                    placeholder="פרטי ההמלצה..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={addRecommendation} loading={recLoading}>שמור</Button>
                  <Button variant="outline" onClick={() => setShowAddRec(false)}>ביטול</Button>
                </div>
              </div>
            </Card>
          )}

          {recs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>אין המלצות עדיין</p>
            </div>
          ) : (
            recs.filter(r => r.is_active).map(rec => (
              <Card key={rec.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="green">{RECOMMENDATION_TYPES[rec.type]}</Badge>
                    </div>
                    <h3 className="font-semibold text-gray-800">{rec.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{rec.content}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(rec.created_at).toLocaleDateString('he-IL')}</p>
                  </div>
                  <button onClick={() => deleteRecommendation(rec.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    ×
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* AI Analysis */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>ניתוח תזונתי AI 🤖</CardTitle></CardHeader>
            <p className="text-sm text-gray-500 mb-4">
              ניתוח AI של נתוני התזונה והמשקל של {patient.full_name} בשבוע האחרון
            </p>
            <Button onClick={generateAiAnalysis} loading={aiLoading}>
              ✨ הפעל ניתוח AI
            </Button>
          </Card>

          {aiResult && (
            <Card>
              <div className="flex items-start justify-between gap-3 mb-4">
                <CardTitle>תוצאות הניתוח</CardTitle>
                <Button variant="secondary" size="sm" onClick={saveAsInsight}>
                  שמור כתובנה לאישור
                </Button>
              </div>
              <div className="bg-[#f5f0e8] rounded-xl p-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiResult}</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
