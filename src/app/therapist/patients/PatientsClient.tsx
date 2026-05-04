'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, PatientDetails, TreatmentGoal, NutritionDailySummary, GOAL_CATEGORIES } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'
import NutritionHistoryChart from '@/components/ui/NutritionHistoryChart'

interface Props {
  therapistId: string
  patients: Profile[]
  todayLoggers: string[]
  weekWeighters: string[]
  details: PatientDetails[]
  initialGoals: TreatmentGoal[]
}

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  treatmentGoals: '',
}

export default function PatientsClient({ therapistId, patients, todayLoggers, weekWeighters, details, initialGoals }: Props) {
  // all goals keyed by patient for quick lookup
  const [allGoals, setAllGoals] = useState<TreatmentGoal[]>(initialGoals)
  // New patient form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createdName, setCreatedName] = useState('')
  const [createdEmail, setCreatedEmail] = useState('')

  // Patient settings modal
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [goalWeight, setGoalWeight] = useState('')
  const [weighInDay, setWeighInDay] = useState('0')
  const [calorieGoal, setCalorieGoal] = useState('2000')
  const [waterGoal, setWaterGoal] = useState('8')
  const [patientNotes, setPatientNotes] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)

  // Treatment goals state
  const [goals, setGoals] = useState<TreatmentGoal[]>([])
  const [newGoalText, setNewGoalText] = useState('')
  const [newGoalCategory, setNewGoalCategory] = useState<string>(GOAL_CATEGORIES[0])
  const [goalLoading, setGoalLoading] = useState(false)

  // Nutrition chart modal
  const [chartPatient, setChartPatient] = useState<Profile | null>(null)
  const [chartSummaries, setChartSummaries] = useState<NutritionDailySummary[]>([])
  const [chartLoading, setChartLoading] = useState(false)

  const { showToast } = useToast()
  const supabase = createClient()

  const todaySet = new Set(todayLoggers)
  const weekSet = new Set(weekWeighters)

  // ── Create patient ──────────────────────────────────────────────────────────
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/create-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || null,
          dateOfBirth: form.dateOfBirth || null,
          treatmentGoals: form.treatmentGoals || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? 'שגיאה ביצירת מטופל', 'error')
        return
      }
      setCreatedName(form.fullName)
      setCreatedEmail(form.email)
      setForm(emptyForm)
      showToast(`${form.fullName} נוצר/ה — אימייל נשלח!`, 'success')
      setTimeout(() => window.location.reload(), 3000)
    } catch {
      showToast('שגיאת רשת', 'error')
    } finally {
      setCreating(false)
    }
  }

  const field = (key: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [key]: value }))

  // ── Patient settings modal ──────────────────────────────────────────────────
  const openPatientModal = (patient: Profile) => {
    const detail = details.find(d => d.patient_id === patient.id)
    setSelectedPatient(patient)
    setGoalWeight(detail?.goal_weight?.toString() ?? '')
    setWeighInDay(detail?.weigh_in_day?.toString() ?? '0')
    setCalorieGoal(detail?.daily_calorie_goal?.toString() ?? '2000')
    setWaterGoal(detail?.daily_water_goal?.toString() ?? '8')
    setPatientNotes(detail?.notes ?? '')
    setNewGoalText('')
    setNewGoalCategory(GOAL_CATEGORIES[0])
    // Seed modal goals from the already-loaded allGoals
    setGoals(allGoals.filter(g => g.patient_id === patient.id))
    setShowPatientModal(true)
  }

  const addGoal = async () => {
    if (!selectedPatient || !newGoalText.trim()) return
    setGoalLoading(true)
    try {
      const res = await fetch('/api/treatment-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatient.id, goal_text: newGoalText, category: newGoalCategory }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'שגיאה בהוספת מטרה', 'error'); return }
      setGoals(prev => [...prev, data])
      setAllGoals(prev => [...prev, data])
      setNewGoalText('')
      showToast('מטרה נוספה', 'success')
    } catch {
      showToast('שגיאת רשת', 'error')
    } finally {
      setGoalLoading(false)
    }
  }

  const deleteGoal = async (id: string) => {
    const res = await fetch(`/api/treatment-goals?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setGoals(prev => prev.filter(g => g.id !== id))
      setAllGoals(prev => prev.filter(g => g.id !== id))
      showToast('מטרה הוסרה', 'info')
    }
  }

  const openChartModal = async (patient: Profile) => {
    setChartPatient(patient)
    setChartSummaries([])
    setChartLoading(true)
    try {
      const res = await fetch(`/api/nutrition-summary?patient_id=${patient.id}&days=30`)
      const data = await res.json()
      setChartSummaries(Array.isArray(data) ? data : [])
    } catch {
      showToast('שגיאה בטעינת נתונים', 'error')
    } finally {
      setChartLoading(false)
    }
  }

  const savePatientDetails = async () => {
    if (!selectedPatient) return
    setSaveLoading(true)
    try {
      await supabase.from('patient_details').upsert({
        patient_id: selectedPatient.id,
        therapist_id: therapistId,
        goal_weight: goalWeight ? parseFloat(goalWeight) : null,
        weigh_in_day: parseInt(weighInDay),
        daily_calorie_goal: parseInt(calorieGoal),
        daily_water_goal: parseInt(waterGoal),
        notes: patientNotes || null,
      }, { onConflict: 'patient_id' })
      showToast('פרטי המטופל עודכנו', 'success')
      setShowPatientModal(false)
    } catch {
      showToast('שגיאה בשמירה', 'error')
    } finally {
      setSaveLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#4a7c59]">מטופלים 👥</h1>
        <Button onClick={() => { setShowForm(s => !s); setCreatedName('') }} variant="outline">
          {showForm ? 'סגור' : '+ הוסף מטופל'}
        </Button>
      </div>

      {/* ── New patient form ── */}
      {showForm && (
        <Card className="border-[#4a7c59]/40 border-2">
          <CardHeader><CardTitle>הוספת מטופל חדש</CardTitle></CardHeader>

          {createdName ? (
            /* Success state — email was sent automatically */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">📧</div>
                <p className="text-green-700 font-semibold text-lg">{createdName} נוסף/ה בהצלחה!</p>
                <p className="text-green-600 text-sm mt-1">
                  אימייל עם קישור להגדרת סיסמה נשלח אוטומטית אל
                </p>
                <p className="text-green-700 font-medium text-sm mt-0.5">{createdEmail}</p>
                <p className="text-gray-400 text-xs mt-3">הדף יתרענן אוטומטית...</p>
              </div>
              <Button variant="outline" onClick={() => { setCreatedName(''); setShowForm(false) }}>
                סגור
              </Button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="שם מלא *"
                  type="text"
                  value={form.fullName}
                  onChange={e => field('fullName', e.target.value)}
                  placeholder="ישראל ישראלי"
                  required
                />
                <Input
                  label="אימייל *"
                  type="email"
                  value={form.email}
                  onChange={e => field('email', e.target.value)}
                  placeholder="patient@email.com"
                  required
                />
                <Input
                  label="טלפון"
                  type="tel"
                  value={form.phone}
                  onChange={e => field('phone', e.target.value)}
                  placeholder="050-0000000"
                />
                <Input
                  label="תאריך לידה"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => field('dateOfBirth', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">מטרות טיפול</label>
                <textarea
                  value={form.treatmentGoals}
                  onChange={e => field('treatmentGoals', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] resize-none h-24 text-sm"
                  placeholder="לדוגמה: ירידה במשקל, שיפור אנרגיה, ויסות סוכר..."
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" loading={creating} disabled={!form.fullName || !form.email}>
                  {creating ? 'יוצר מטופל...' : 'צור מטופל ושלח קישור'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>ביטול</Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* ── Patients list ── */}
      <div className="space-y-3">
        {patients.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <p>אין מטופלים עדיין</p>
            <p className="text-sm mt-1">לחצ/י על "הוסף מטופל" כדי להתחיל</p>
          </div>
        ) : (
          patients.map(patient => (
            <Card key={patient.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 bg-[#c8dece] rounded-full flex items-center justify-center text-[#4a7c59] font-bold flex-shrink-0 mt-0.5">
                    {patient.full_name?.[0] ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{patient.full_name}</h3>
                    <p className="text-xs text-gray-400 truncate">{patient.email}</p>
                    {allGoals.filter(g => g.patient_id === patient.id).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {allGoals.filter(g => g.patient_id === patient.id).map(g => (
                          <span key={g.id} className="inline-flex items-center gap-1 text-xs bg-[#f5f0e8] text-[#4a7c59] rounded-full px-2 py-0.5">
                            <span className="font-medium">{g.category}:</span>
                            <span className="text-gray-600 max-w-[140px] truncate">{g.goal_text}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {todaySet.has(patient.id)
                    ? <Badge variant="green">רשם היום</Badge>
                    : <Badge variant="yellow">לא רשם</Badge>
                  }
                  {weekSet.has(patient.id)
                    ? <Badge variant="green">⚖️ שקל</Badge>
                    : <Badge variant="red">⚖️ לא שקל</Badge>
                  }
                  <Button variant="outline" size="sm" onClick={() => openChartModal(patient)}>
                    📊 גרפים
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openPatientModal(patient)}>
                    הגדרות
                  </Button>
                  <Link href={`/therapist/patients/${patient.id}`}>
                    <Button variant="ghost" size="sm">פרופיל</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ── Nutrition chart modal ── */}
      {chartPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#4a7c59]">היסטוריית תזונה — {chartPatient.full_name}</h2>
              <button onClick={() => setChartPatient(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            {chartLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <span className="text-4xl animate-spin">⏳</span>
              </div>
            ) : (
              <NutritionHistoryChart summaries={chartSummaries} />
            )}
          </div>
        </div>
      )}

      {/* ── Patient settings modal ── */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#4a7c59]">הגדרות — {selectedPatient.full_name}</h2>
              <button onClick={() => setShowPatientModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <Input
                label='יעד משקל (ק"ג)'
                type="number"
                step="0.1"
                value={goalWeight}
                onChange={e => setGoalWeight(e.target.value)}
                placeholder="70"
              />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">יום שקילה קבוע</label>
                <select
                  value={weighInDay}
                  onChange={e => setWeighInDay(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
                >
                  {DAYS.map((day, i) => <option key={i} value={i}>{day}</option>)}
                </select>
              </div>
              <Input
                label="יעד קלוריות יומי"
                type="number"
                value={calorieGoal}
                onChange={e => setCalorieGoal(e.target.value)}
                placeholder="2000"
              />
              <Input
                label="יעד מים יומי (כוסות)"
                type="number"
                value={waterGoal}
                onChange={e => setWaterGoal(e.target.value)}
                placeholder="8"
              />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">הערות</label>
                <textarea
                  value={patientNotes}
                  onChange={e => setPatientNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] resize-none h-20 text-sm"
                  placeholder="הערות אישיות..."
                />
              </div>
            </div>
              {/* Treatment Goals */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-sm font-semibold text-[#4a7c59] mb-3">מטרות טיפול</p>
                {/* Existing goals */}
                {goals.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {goals.map(goal => (
                      <div key={goal.id} className="flex items-center justify-between bg-[#f5f0e8] rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-[#4a7c59] ml-2">{goal.category}</span>
                          <span className="text-sm text-gray-700">{goal.goal_text}</span>
                        </div>
                        <button onClick={() => deleteGoal(goal.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg flex-shrink-0 mr-2">×</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Add goal */}
                <div className="space-y-2">
                  <select
                    value={newGoalCategory}
                    onChange={e => setNewGoalCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4a7c59] text-sm"
                  >
                    {GOAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGoalText}
                      onChange={e => setNewGoalText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addGoal()}
                      placeholder="לדוגמה: ירידה של 5 ק&quot;ג ב-3 חודשים"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] text-sm"
                    />
                    <Button onClick={addGoal} loading={goalLoading} disabled={!newGoalText.trim()} size="sm">
                      + הוסף
                    </Button>
                  </div>
                </div>
              </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={savePatientDetails} loading={saveLoading} className="flex-1">שמור</Button>
              <Button variant="outline" onClick={() => setShowPatientModal(false)} className="flex-1">ביטול</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
