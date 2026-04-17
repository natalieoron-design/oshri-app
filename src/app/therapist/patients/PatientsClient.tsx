'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, PatientDetails } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'

interface Props {
  therapistId: string
  patients: Profile[]
  todayLoggers: string[]
  weekWeighters: string[]
  details: PatientDetails[]
}

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  treatmentGoals: '',
}

export default function PatientsClient({ therapistId, patients, todayLoggers, weekWeighters, details }: Props) {
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
    setShowPatientModal(true)
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-[#c8dece] rounded-full flex items-center justify-center text-[#4a7c59] font-bold flex-shrink-0">
                    {patient.full_name?.[0] ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{patient.full_name}</h3>
                    <p className="text-xs text-gray-400 truncate">{patient.email}</p>
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
