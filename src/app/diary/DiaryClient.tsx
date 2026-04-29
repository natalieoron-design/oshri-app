'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FoodEntry, WaterIntake, AiInsight, PatientDetails, MEAL_TYPES } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { fileToBase64 } from '@/lib/utils'

interface Props {
  userId: string
  initialEntries: FoodEntry[]
  initialWater: WaterIntake | null
  insights: AiInsight[]
  details: PatientDetails | null
  today: string
}

type Tab = 'diary' | 'insights'
type InputMode = 'text' | 'photo' | 'voice'

export default function DiaryClient({ userId, initialEntries, initialWater, insights, details, today }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('diary')
  const [entries, setEntries] = useState<FoodEntry[]>(initialEntries)
  const [cups, setCups] = useState(initialWater?.cups ?? 0)
  const [selectedDate, setSelectedDate] = useState(today)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState<FoodEntry['meal_type']>('lunch')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const { showToast } = useToast()
  const supabase = createClient()

  const totalCalories = entries.reduce((s, e) => s + (e.calories ?? 0), 0)
  const totalProtein = entries.reduce((s, e) => s + (e.protein ?? 0), 0)
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs ?? 0), 0)
  const totalFat = entries.reduce((s, e) => s + (e.fat ?? 0), 0)
  const waterGoal = details?.daily_water_goal ?? 8
  const calorieGoal = details?.daily_calorie_goal ?? 2000

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  const startRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      showToast('הדפדפן שלך אינו תומך בהקלטת קול. נסה/י Chrome.', 'error')
      return
    }

    setTranscript('')
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'he-IL'
    recognition.continuous = true
    recognition.interimResults = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setTranscript(text)
    }

    recognition.onerror = () => {
      showToast('שגיאה בזיהוי קול — נסה/י שוב', 'error')
      setIsRecording(false)
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  const analyzeWithAI = async (payload: {
    description?: string
    imageBase64?: string
    audioBase64?: string
    inputType: string
  }) => {
    const res = await fetch('/api/analyze-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('AI analysis failed')
    return res.json()
  }

  const handleSubmit = async () => {
    if (inputMode === 'text' && !description.trim()) {
      showToast('אנא הזן תיאור ארוחה', 'error')
      return
    }
    setLoading(true)
    try {
      let aiResult: Record<string, unknown> = {}
      let finalDescription = description
      let photoUrl: string | null = null

      if (inputMode === 'photo' && photoFile) {
        const base64 = await fileToBase64(photoFile)
        aiResult = await analyzeWithAI({ imageBase64: base64, inputType: 'photo' })
        finalDescription = aiResult.description as string || 'ארוחה מתמונה'
        // Upload photo
        const filename = `${userId}/${Date.now()}.${photoFile.name.split('.').pop()}`
        const { data: uploadData } = await supabase.storage.from('meal-photos').upload(filename, photoFile)
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('meal-photos').getPublicUrl(filename)
          photoUrl = urlData.publicUrl
        }
      } else if (inputMode === 'voice') {
        stopRecording()
        if (!transcript.trim()) {
          showToast('לא זוהה קול — נסה/י שוב', 'error')
          setLoading(false)
          return
        }
        aiResult = await analyzeWithAI({ description: transcript, inputType: 'voice' })
        finalDescription = aiResult.description as string || transcript
      } else {
        aiResult = await analyzeWithAI({ description, inputType: 'text' })
      }

      const { data, error } = await supabase.from('food_diary').insert({
        patient_id: userId,
        meal_type: mealType,
        description: finalDescription,
        input_type: inputMode,
        photo_url: photoUrl,
        calories: aiResult.calories,
        protein: aiResult.protein,
        carbs: aiResult.carbs,
        fat: aiResult.fat,
        fiber: aiResult.fiber,
        ai_analysis: aiResult,
      }).select().single()

      if (error) throw error

      setEntries(prev => [data, ...prev])
      setDescription('')
      setPhotoPreview(null)
      setPhotoFile(null)
      showToast('הארוחה נרשמה בהצלחה', 'success')
    } catch (err) {
      console.error(err)
      showToast('שגיאה ברישום הארוחה', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateWater = async (newCups: number) => {
    const clamped = Math.max(0, newCups)
    setCups(clamped)
    await supabase.from('water_intake').upsert({
      patient_id: userId,
      date: today,
      cups: clamped,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id,date' })
  }

  const deleteEntry = async (id: string) => {
    await supabase.from('food_diary').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    showToast('הרשומה נמחקה', 'info')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#4a7c59]">יומן תזונה</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="text-sm border border-[#c8dece] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
        />
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-[#c8dece]/50 w-fit gap-1">
        {(['diary', 'insights'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-[#4a7c59] text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'diary' ? 'יומן' : 'תובנות'}
          </button>
        ))}
      </div>

      {activeTab === 'diary' && (
        <>
          {/* Daily Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'קלוריות', value: `${Math.round(totalCalories)} / ${calorieGoal}`, sub: 'קק"ל' },
              { label: 'חלבון', value: `${Math.round(totalProtein)}g`, sub: '' },
              { label: 'פחמימות', value: `${Math.round(totalCarbs)}g`, sub: '' },
              { label: 'שומן', value: `${Math.round(totalFat)}g`, sub: '' },
            ].map(stat => (
              <Card key={stat.label} className="text-center py-3">
                <div className="text-xl font-bold text-[#4a7c59]">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label} {stat.sub}</div>
              </Card>
            ))}
          </div>

          {/* Water tracker */}
          <Card>
            <CardHeader><CardTitle>מים 💧</CardTitle></CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {Array.from({ length: waterGoal }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => updateWater(i < cups ? i : i + 1)}
                    className={`w-8 h-8 rounded-full border-2 transition-all text-lg ${
                      i < cups
                        ? 'bg-[#4a7c59] border-[#4a7c59] text-white'
                        : 'border-[#c8dece] text-[#c8dece]'
                    }`}
                  >
                    💧
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-bold text-[#4a7c59]">{cups}</span> / {waterGoal} כוסות
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => updateWater(cups - 1)}>-</Button>
              <Button variant="secondary" size="sm" onClick={() => updateWater(cups + 1)}>+ כוס</Button>
            </div>
          </Card>

          {/* Add Meal */}
          <Card>
            <CardHeader><CardTitle>רשום ארוחה</CardTitle></CardHeader>

            {/* Input Mode Toggle */}
            <div className="flex gap-2 mb-4">
              {(['text', 'photo', 'voice'] as InputMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    inputMode === mode
                      ? 'border-[#4a7c59] bg-[#4a7c59] text-white'
                      : 'border-[#c8dece] text-gray-600 hover:border-[#6a9e78]'
                  }`}
                >
                  {mode === 'text' ? '✍️ טקסט' : mode === 'photo' ? '📷 תמונה' : '🎤 קול'}
                </button>
              ))}
            </div>

            {/* Meal type */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {(Object.entries(MEAL_TYPES) as [FoodEntry['meal_type'], string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setMealType(key)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    mealType === key
                      ? 'bg-[#4a7c59] text-white'
                      : 'bg-[#c8dece]/50 text-gray-600 hover:bg-[#c8dece]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Input area */}
            {inputMode === 'text' && (
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="תאר/י מה אכלת... לדוגמה: קערת שיבולת שועל עם פירות ודבש"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] resize-none h-24 text-sm"
              />
            )}

            {inputMode === 'photo' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="meal" className="w-full h-48 object-cover rounded-xl" />
                    <button
                      onClick={() => { setPhotoPreview(null); setPhotoFile(null) }}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-[#c8dece] rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-[#4a7c59] hover:text-[#4a7c59] transition-all"
                  >
                    <span className="text-3xl">📷</span>
                    <span className="text-sm">לחץ להעלאת תמונה</span>
                  </button>
                )}
              </div>
            )}

            {inputMode === 'voice' && (
              <div className="py-4">
                {isRecording ? (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-2xl">🎤</span>
                      </div>
                      <p className="text-sm text-gray-600">מקליט... אמור/י מה אכלת</p>
                    </div>
                    {transcript ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 min-h-[48px] leading-relaxed">
                        {transcript}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400 text-center">
                        ממתין לדיבור...
                      </div>
                    )}
                    <Button variant="danger" onClick={handleSubmit} loading={loading} className="w-full">
                      עצור ושלח לניתוח AI
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-[#c8dece] rounded-full flex items-center justify-center">
                      <span className="text-2xl">🎤</span>
                    </div>
                    <p className="text-sm text-gray-600">לחץ/י להתחיל הקלטה ואמור/י מה אכלת</p>
                    <Button variant="secondary" onClick={startRecording}>התחל הקלטה</Button>
                  </div>
                )}
              </div>
            )}

            {inputMode !== 'voice' && (
              <Button
                onClick={handleSubmit}
                loading={loading}
                className="w-full mt-4"
                size="lg"
              >
                ✨ נתח ורשום עם AI
              </Button>
            )}
          </Card>

          {/* Entries List */}
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">🍽️</div>
                <p>לא נרשמו ארוחות היום</p>
              </div>
            ) : (
              entries.map(entry => (
                <Card key={entry.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="green">{MEAL_TYPES[entry.meal_type]}</Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.logged_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Badge variant="gray">
                          {entry.input_type === 'photo' ? '📷' : entry.input_type === 'voice' ? '🎤' : '✍️'}
                        </Badge>
                      </div>
                      {entry.photo_url && (
                        <img src={entry.photo_url} alt="meal" className="w-full h-32 object-cover rounded-lg mb-2" />
                      )}
                      <p className="text-sm text-gray-700">{entry.description}</p>
                      {entry.calories && (
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>🔥 {Math.round(entry.calories)} קק"ל</span>
                          <span>💪 {Math.round(entry.protein ?? 0)}g חלבון</span>
                          <span>🌾 {Math.round(entry.carbs ?? 0)}g פחמ׳</span>
                          <span>🥑 {Math.round(entry.fat ?? 0)}g שומן</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1"
                    >
                      ×
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🤖</div>
              <p>אין תובנות מאושרות עדיין</p>
              <p className="text-sm mt-1">המטפלת תאשר תובנות AI בהקדם</p>
            </div>
          ) : (
            insights.map(insight => (
              <Card key={insight.id}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#c8dece] rounded-full flex items-center justify-center flex-shrink-0">
                    <span>{insight.insight_type === 'menu' ? '🍽️' : insight.insight_type === 'recipe' ? '👩‍🍳' : '💡'}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="green">מאושר</Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(insight.generated_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{insight.content}</p>
                    {insight.therapist_notes && (
                      <div className="mt-3 bg-[#f5f0e8] rounded-lg p-3">
                        <p className="text-xs font-medium text-[#4a7c59] mb-1">הערת המטפלת:</p>
                        <p className="text-sm text-gray-600">{insight.therapist_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
