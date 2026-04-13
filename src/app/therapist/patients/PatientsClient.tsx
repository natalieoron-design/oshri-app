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

export default function PatientsClient({ therapistId, patients, todayLoggers, weekWeighters, details }: Props) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
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

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviteLoading(true)
    try {
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      const { error } = await supabase.from('invite_tokens').insert({
        token,
        email: inviteEmail,
        therapist_id: therapistId,
      })
      if (error) throw error
      const link = `${window.location.origin}/auth/invite?token=${token}`
      setInviteLink(link)
      showToast('קישור הזמנה נוצר', 'success')
    } catch {
      showToast('שגיאה ביצירת קישור', 'error')
    } finally {
      setInviteLoading(false)
    }
  }

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

  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#4a7c59]">מטופלים 👥</h1>
        <Button onClick={() => setShowInvite(!showInvite)} variant="outline">
          ✉️ הזמן מטופל
        </Button>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <Card className="border-[#4a7c59]/30 border-2">
          <CardHeader><CardTitle>הזמנת מטופל חדש</CardTitle></CardHeader>
          <div className="flex gap-3">
            <Input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="כתובת אימייל של המטופל"
              className="flex-1"
            />
            <Button onClick={handleInvite} loading={inviteLoading}>צור קישור</Button>
          </div>
          {inviteLink && (
            <div className="mt-4 bg-[#c8dece]/30 rounded-xl p-4">
              <p className="text-sm font-medium text-[#4a7c59] mb-2">קישור ההזמנה:</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-white border border-[#c8dece] rounded-lg px-3 py-2 text-sm text-gray-600"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('הועתק!', 'success') }}
                >
                  העתק
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Patients list */}
      <div className="space-y-3">
        {patients.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <p>אין מטופלים עדיין</p>
            <p className="text-sm mt-1">שלח קישור הזמנה כדי להוסיף מטופלים</p>
          </div>
        ) : (
          patients.map(patient => (
            <Card key={patient.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#c8dece] rounded-full flex items-center justify-center text-[#4a7c59] font-bold">
                    {patient.full_name?.[0] ?? '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{patient.full_name}</h3>
                    <p className="text-xs text-gray-400">{patient.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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

      {/* Patient Settings Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#4a7c59]">הגדרות - {selectedPatient.full_name}</h2>
              <button onClick={() => setShowPatientModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
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
                  {DAYS.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
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
