'use client'
import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import { NutritionDailySummary } from '@/lib/types'

interface Props {
  summaries: NutritionDailySummary[]
  calorieGoal?: number
}

type ChartTab = 'calories' | 'macros'

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function NutritionHistoryChart({ summaries, calorieGoal }: Props) {
  const [tab, setTab] = useState<ChartTab>('calories')

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-sm">אין נתוני היסטוריה עדיין</p>
        <p className="text-xs mt-1">הנתונים יופיעו לאחר רישום ארוחות ראשונות</p>
      </div>
    )
  }

  const data = summaries.map(s => ({
    date: fmtDate(s.date),
    'קלוריות': Math.round(s.total_calories),
    'חלבון': Math.round(s.total_protein),
    'פחמימות': Math.round(s.total_carbs),
    'שומן': Math.round(s.total_fat),
    meals: s.meals_count,
  }))

  return (
    <div>
      {/* Tab toggle */}
      <div className="flex bg-[#f5f0e8] rounded-xl p-1 gap-1 w-fit mb-4">
        {([['calories', 'קלוריות 🔥'], ['macros', 'מאקרו 💪']] as [ChartTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-[#4a7c59] text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'calories' && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v) => [`${v} קק"ל`, 'קלוריות']}
              labelFormatter={l => `תאריך: ${l}`}
            />
            {calorieGoal && (
              <ReferenceLine y={calorieGoal} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'יעד', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
            )}
            <Bar dataKey="קלוריות" fill="#4a7c59" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {tab === 'macros' && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="g" />
            <Tooltip formatter={(v, name) => [`${v}g`, name]} labelFormatter={l => `תאריך: ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="חלבון" stroke="#4a7c59" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="פחמימות" stroke="#6a9e78" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="שומן" stroke="#c8dece" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <p className="text-xs text-gray-400 mt-2 text-center">{summaries.length} ימים עם נתונים</p>
    </div>
  )
}
