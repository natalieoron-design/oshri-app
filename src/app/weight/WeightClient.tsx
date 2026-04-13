'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeightLog, PatientDetails } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getDayName } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

interface Props {
  userId: string
  initialLogs: WeightLog[]
  details: PatientDetails | null
}

export default function WeightClient({ userId, initialLogs, details }: Props) {
  const [logs, setLogs] = useState<WeightLog[]>(initialLogs)
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const latestWeight = logs[logs.length - 1]
  const firstWeight = logs[0]
  const totalChange = latestWeight && firstWeight
    ? latestWeight.weight - firstWeight.weight
    : null
  const goalWeight = details?.goal_weight
  const toGoal = latestWeight && goalWeight
    ? latestWeight.weight - goalWeight
    : null

  const chartData = logs.map(log => ({
    date: new Date(log.logged_at).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }),
    weight: log.weight,
    fullDate: log.logged_at,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(weight)
    if (!num || num < 20 || num > 300) {
      showToast('נא להזין משקל תקין', 'error')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.from('weight_logs').upsert({
        patient_id: userId,
        weight: num,
        logged_at: date,
        notes: notes || null,
      }, { onConflict: 'patient_id,logged_at' }).select().single()

      if (error) throw error

      setLogs(prev => {
        const filtered = prev.filter(l => l.logged_at !== date)
        return [...filtered, data].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
      })
      setWeight('')
      setNotes('')
      showToast('המשקל נרשם בהצלחה', 'success')
    } catch {
      showToast('שגיאה ברישום המשקל', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteLog = async (id: string) => {
    await supabase.from('weight_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
    showToast('הרשומה נמחקה', 'info')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#4a7c59]">מעקב משקל ⚖️</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#4a7c59]">
            {latestWeight ? `${latestWeight.weight}` : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">משקל נוכחי (ק"ג)</div>
        </Card>

        <Card className="text-center">
          <div className="text-2xl font-bold text-[#4a7c59]">
            {goalWeight ? `${goalWeight}` : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">יעד (ק"ג)</div>
        </Card>

        <Card className="text-center">
          <div className={`text-2xl font-bold ${totalChange !== null ? (totalChange < 0 ? 'text-green-600' : 'text-red-500') : 'text-[#4a7c59]'}`}>
            {totalChange !== null ? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}` : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">שינוי כולל (ק"ג)</div>
        </Card>

        <Card className="text-center">
          <div className={`text-2xl font-bold ${toGoal !== null ? (toGoal <= 0 ? 'text-green-600' : 'text-[#4a7c59]') : 'text-[#4a7c59]'}`}>
            {toGoal !== null ? (toGoal <= 0 ? '🎯 הגעת!' : `${toGoal.toFixed(1)}`) : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">נותר ליעד (ק"ג)</div>
        </Card>
      </div>

      {/* Chart */}
      {logs.length > 1 && (
        <Card>
          <CardHeader><CardTitle>גרף התקדמות</CardTitle></CardHeader>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c8dece50" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  unit="ק"
                />
                <Tooltip
                  formatter={(value) => [`${value} ק"ג`, 'משקל']}
                  labelStyle={{ direction: 'rtl' }}
                />
                {goalWeight && (
                  <ReferenceLine
                    y={goalWeight}
                    stroke="#6a9e78"
                    strokeDasharray="5 5"
                    label={{ value: `יעד: ${goalWeight}`, position: 'insideTopRight', fill: '#6a9e78', fontSize: 11 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#4a7c59"
                  strokeWidth={2.5}
                  dot={{ fill: '#4a7c59', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Log Weight */}
      <Card>
        <CardHeader><CardTitle>רשום משקל</CardTitle></CardHeader>
        {details?.weigh_in_day !== undefined && details?.weigh_in_day !== null && (
          <div className="bg-[#c8dece]/30 rounded-lg px-4 py-2 mb-4 text-sm text-[#4a7c59]">
            💡 יום שקילה מוגדר: <strong>{getDayName(details.weigh_in_day)}</strong>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="משקל (ק&quot;ג)"
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="70.5"
              required
            />
            <Input
              label="תאריך"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">הערות (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="הערות נוספות..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] text-sm resize-none h-20"
            />
          </div>
          <Button type="submit" loading={loading} size="lg">
            שמור משקל
          </Button>
        </form>
      </Card>

      {/* History */}
      <Card>
        <CardHeader><CardTitle>היסטוריה</CardTitle></CardHeader>
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 py-6">לא נרשמו מדידות עדיין</p>
        ) : (
          <div className="space-y-2">
            {[...logs].reverse().map((log, idx) => {
              const prev = [...logs].reverse()[idx + 1]
              const change = prev ? log.weight - prev.weight : null
              return (
                <div key={log.id} className="flex items-center justify-between p-3 bg-[#f5f0e8] rounded-xl">
                  <div>
                    <span className="font-medium text-[#4a7c59]">{log.weight} ק"ג</span>
                    {change !== null && (
                      <span className={`mr-2 text-sm ${change < 0 ? 'text-green-600' : change > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {change < 0 ? '▼' : change > 0 ? '▲' : '→'} {Math.abs(change).toFixed(1)}
                      </span>
                    )}
                    {log.notes && <p className="text-xs text-gray-500 mt-0.5">{log.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                      {new Date(log.logged_at).toLocaleDateString('he-IL')}
                    </span>
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
