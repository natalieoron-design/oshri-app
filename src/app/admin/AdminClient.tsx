'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface DayData { date: string; diary: number; weight: number; logins: number }
interface PatientActivity {
  id: string; name: string | null; email: string; joined: string
  lastLogin: string | null; lastDiary: string | null; lastWeight: string | null; loggedToday: boolean
}
interface NotifRule {
  id: string; name: string; trigger_type: string; trigger_time: string | null
  trigger_days: number[] | null; custom_message: string | null; is_active: boolean; created_at: string
}
interface MessageTemplate { id: string; name: string; content: string; category: string; created_at: string }
interface AppSetting { key: string; value: string; label: string | null }

interface Props {
  days: DayData[]
  patientActivity: PatientActivity[]
  totalPatients: number
  notifRules: NotifRule[]
  templates: MessageTemplate[]
  settings: AppSetting[]
  therapistId: string
}

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const TRIGGER_TYPES = {
  no_food_diary: 'לא מילאו יומן תזונה',
  no_weight_log: 'לא רשמו משקל',
  no_water_log: 'לא מילאו מים',
}

const TEMPLATE_CATEGORIES = {
  reminder: 'תזכורת',
  encouragement: 'עידוד',
  general: 'כללי',
  nutrition: 'תזונה',
}

const DEFAULT_SETTINGS: AppSetting[] = [
  { key: 'app_name', value: 'אושרי הרץ - נטורופתית N.D', label: 'שם האפליקציה' },
  { key: 'reminder_default_time', value: '20:00', label: 'שעת תזכורת ברירת מחדל' },
  { key: 'water_goal_default', value: '8', label: 'יעד כוסות מים (ברירת מחדל)' },
  { key: 'calorie_goal_default', value: '1800', label: 'יעד קלוריות (ברירת מחדל)' },
  { key: 'welcome_message', value: 'ברוכים הבאים לאפליקציית הבריאות של אושרי הרץ!', label: 'הודעת ברוכים הבאים' },
]

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit' })
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab({ days, patientActivity, totalPatients }: { days: DayData[]; patientActivity: PatientActivity[]; totalPatients: number }) {
  const chartData = days.map(d => ({ ...d, label: formatShortDate(d.date) }))
  const loggedToday = patientActivity.filter(p => p.loggedToday).length
  const activeThisWeek = patientActivity.filter(p => {
    if (!p.lastDiary) return false
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(p.lastDiary) >= weekAgo
  }).length

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-[#4a7c59]">{totalPatients}</div>
          <div className="text-xs text-gray-500 mt-1">סה״כ מטופלים</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-green-600">{loggedToday}</div>
          <div className="text-xs text-gray-500 mt-1">מילאו יומן היום</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-blue-600">{activeThisWeek}</div>
          <div className="text-xs text-gray-500 mt-1">פעילים השבוע</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-orange-500">{totalPatients - loggedToday}</div>
          <div className="text-xs text-gray-500 mt-1">לא מילאו היום</div>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>פעילות 30 הימים האחרונים</CardTitle>
        </CardHeader>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(value, name) => {
                  const labels: Record<string, string> = { diary: 'יומן תזונה', weight: 'משקל', logins: 'כניסות' }
                  return [value, labels[name as string] ?? name]
                }}
              />
              <Legend formatter={(value) => {
                const labels: Record<string, string> = { diary: 'יומן תזונה', weight: 'משקל', logins: 'כניסות' }
                return labels[value] ?? value
              }} />
              <Line type="monotone" dataKey="logins" stroke="#4a7c59" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="diary" stroke="#6a9e78" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="weight" stroke="#c8a96e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Patient table */}
      <Card>
        <CardHeader><CardTitle>פעילות מטופלים</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right border-b border-gray-100">
                <th className="pb-2 font-medium text-gray-500">שם</th>
                <th className="pb-2 font-medium text-gray-500">כניסה אחרונה</th>
                <th className="pb-2 font-medium text-gray-500">יומן אחרון</th>
                <th className="pb-2 font-medium text-gray-500">משקל אחרון</th>
                <th className="pb-2 font-medium text-gray-500">היום</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {patientActivity.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-800">{p.name ?? p.email}</td>
                  <td className="py-2 text-gray-500">{formatDate(p.lastLogin)}</td>
                  <td className="py-2 text-gray-500">{formatDate(p.lastDiary)}</td>
                  <td className="py-2 text-gray-500">{formatDate(p.lastWeight)}</td>
                  <td className="py-2">
                    {p.loggedToday
                      ? <Badge variant="green">רשם</Badge>
                      : <Badge variant="yellow">לא רשם</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab({ initialRules }: { initialRules: NotifRule[] }) {
  const [rules, setRules] = useState(initialRules)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    trigger_type: 'no_food_diary',
    trigger_time: '20:00',
    trigger_days: [0, 1, 2, 3, 4, 5, 6] as number[],
    custom_message: '',
    is_active: true,
  })

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      trigger_days: f.trigger_days.includes(day)
        ? f.trigger_days.filter(d => d !== day)
        : [...f.trigger_days, day].sort()
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/notification-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setRules(r => [data, ...r])
        setShowForm(false)
        setForm({ name: '', trigger_type: 'no_food_diary', trigger_time: '20:00', trigger_days: [0,1,2,3,4,5,6], custom_message: '', is_active: true })
      }
    } finally { setSaving(false) }
  }

  const toggleActive = async (rule: NotifRule) => {
    const res = await fetch('/api/admin/notification-rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
    })
    if (res.ok) {
      setRules(r => r.map(x => x.id === rule.id ? { ...x, is_active: !x.is_active } : x))
    }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('למחוק את הכלל?')) return
    const res = await fetch('/api/admin/notification-rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setRules(r => r.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">נוטיפיקציות אוטומטיות</h2>
          <p className="text-sm text-gray-500">הגדרת תזכורות שיישלחו אוטומטית למטופלים</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)} variant="primary" size="sm">
          {showForm ? 'ביטול' : '+ כלל חדש'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#4a7c59]/30">
          <CardHeader><CardTitle>כלל חדש</CardTitle></CardHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם הכלל</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30"
                placeholder="למשל: תזכורת יומן ערב"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טריגר</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30 bg-white"
                  value={form.trigger_type}
                  onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))}
                >
                  {Object.entries(TRIGGER_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שעת שליחה</label>
                <input
                  type="time"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30"
                  value={form.trigger_time}
                  onChange={e => setForm(f => ({ ...f, trigger_time: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ימים בשבוע</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_HE.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      form.trigger_days.includes(i)
                        ? 'bg-[#4a7c59] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תוכן ההודעה</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30 resize-none"
                rows={3}
                placeholder="הי {שם}, שכחת למלא את יומן התזונה היום! 🌿"
                value={form.custom_message}
                onChange={e => setForm(f => ({ ...f, custom_message: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1">ניתן להשתמש ב-{'{שם}'} לשם המטופל</p>
            </div>
            <Button onClick={save} disabled={saving || !form.name} variant="primary">
              {saving ? 'שומר...' : 'שמירת כלל'}
            </Button>
          </div>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-gray-400 text-sm">אין כללים מוגדרים עדיין</p>
          <p className="text-gray-300 text-xs mt-1">צרי כלל ראשון למעלה</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={`transition-opacity ${rule.is_active ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">{rule.name}</span>
                    <Badge variant={rule.is_active ? 'green' : 'gray'}>
                      {rule.is_active ? 'פעיל' : 'כבוי'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 space-y-0.5">
                    <div>טריגר: {TRIGGER_TYPES[rule.trigger_type as keyof typeof TRIGGER_TYPES] ?? rule.trigger_type}</div>
                    {rule.trigger_time && <div>שעה: {rule.trigger_time}</div>}
                    {rule.trigger_days && (
                      <div>ימים: {rule.trigger_days.map(d => DAYS_HE[d]).join(', ')}</div>
                    )}
                    {rule.custom_message && (
                      <div className="text-gray-400 text-xs mt-1 truncate">{rule.custom_message}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(rule)}
                    className="text-xs text-gray-500 hover:text-[#4a7c59] underline"
                  >
                    {rule.is_active ? 'כיבוי' : 'הפעלה'}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-xs text-red-400 hover:text-red-600 underline"
                  >
                    מחיקה
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-700 font-medium">הערה</p>
        <p className="text-xs text-amber-600 mt-1">
          הכללים נשמרים במסד הנתונים. לשליחה אוטומטית בפועל יש להגדיר Supabase Edge Function / cron job שירוץ כל שעה ויבדוק את הכללים.
        </p>
      </Card>
    </div>
  )
}

// ── Templates Tab ─────────────────────────────────────────────────────────────
function TemplatesTab({ initialTemplates }: { initialTemplates: MessageTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', content: '', category: 'general' })

  const openNew = () => { setForm({ name: '', content: '', category: 'general' }); setEditId(null); setShowForm(true) }
  const openEdit = (t: MessageTemplate) => { setForm({ name: t.name, content: t.content, category: t.category }); setEditId(t.id); setShowForm(true) }

  const save = async () => {
    setSaving(true)
    try {
      const method = editId ? 'PUT' : 'POST'
      const body = editId ? { id: editId, ...form } : form
      const res = await fetch('/api/admin/message-templates', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        if (editId) {
          setTemplates(ts => ts.map(t => t.id === editId ? data : t))
        } else {
          setTemplates(ts => [data, ...ts])
        }
        setShowForm(false); setEditId(null)
      }
    } finally { setSaving(false) }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('למחוק את התבנית?')) return
    const res = await fetch('/api/admin/message-templates', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    if (res.ok) setTemplates(ts => ts.filter(t => t.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">תבניות הודעות</h2>
          <p className="text-sm text-gray-500">תבניות מוכנות לשליחה מהירה למטופלים</p>
        </div>
        <Button onClick={openNew} variant="primary" size="sm">+ תבנית חדשה</Button>
      </div>

      {showForm && (
        <Card className="border-[#4a7c59]/30">
          <CardHeader><CardTitle>{editId ? 'עריכת תבנית' : 'תבנית חדשה'}</CardTitle></CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם התבנית</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30"
                  placeholder="למשל: תזכורת שקילה שבועית"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30 bg-white"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {Object.entries(TEMPLATE_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תוכן ההודעה</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30 resize-none"
                rows={4}
                placeholder="תוכן ההודעה... ניתן להשתמש ב-{שם} לשם המטופל"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1">ניתן להשתמש ב-{'{שם}'} לשם המטופל</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving || !form.name || !form.content} variant="primary">
                {saving ? 'שומר...' : 'שמירה'}
              </Button>
              <Button onClick={() => { setShowForm(false); setEditId(null) }} variant="secondary">ביטול</Button>
            </div>
          </div>
        </Card>
      )}

      {templates.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-gray-400 text-sm">אין תבניות עדיין</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <Card key={t.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-800 text-sm">{t.name}</span>
                  <Badge variant="gray" className="mr-2 text-xs">
                    {TEMPLATE_CATEGORIES[t.category as keyof typeof TEMPLATE_CATEGORIES] ?? t.category}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(t)} className="text-xs text-gray-500 hover:text-[#4a7c59] underline">עריכה</button>
                  <button onClick={() => deleteTemplate(t.id)} className="text-xs text-red-400 hover:text-red-600 underline">מחיקה</button>
                </div>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{t.content}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ initialSettings }: { initialSettings: AppSetting[] }) {
  const merged = DEFAULT_SETTINGS.map(def => {
    const saved = initialSettings.find(s => s.key === def.key)
    return saved ?? def
  })
  const [settings, setSettings] = useState(merged)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (key: string, value: string) => {
    setSettings(ss => ss.map(s => s.key === key ? { ...s, value } : s))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) setSaved(true)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">הגדרות כלליות</h2>
        <p className="text-sm text-gray-500">הגדרות ברירת מחדל של האפליקציה</p>
      </div>
      <Card>
        <div className="space-y-5">
          {settings.map(s => (
            <div key={s.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{s.label ?? s.key}</label>
              {s.key === 'welcome_message' ? (
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30 resize-none"
                  rows={3}
                  value={s.value}
                  onChange={e => update(s.key, e.target.value)}
                />
              ) : (
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/30"
                  type={s.key.includes('time') ? 'time' : s.key.includes('goal') ? 'number' : 'text'}
                  value={s.value}
                  onChange={e => update(s.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save} disabled={saving} variant="primary">
            {saving ? 'שומר...' : 'שמירת הגדרות'}
          </Button>
          {saved && <span className="text-sm text-green-600">נשמר בהצלחה ✓</span>}
        </div>
      </Card>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'analytics', label: 'אנליטיקס', icon: '📊' },
  { id: 'notifications', label: 'נוטיפיקציות', icon: '🔔' },
  { id: 'templates', label: 'תבניות הודעות', icon: '📝' },
  { id: 'settings', label: 'הגדרות', icon: '⚙️' },
]

export default function AdminClient({ days, patientActivity, totalPatients, notifRules, templates, settings }: Props) {
  const [activeTab, setActiveTab] = useState('analytics')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4a7c59]">ממשק אדמין 🛠️</h1>
          <p className="text-gray-500 text-sm mt-1">ניהול מתקדם של האפליקציה</p>
        </div>
        <Link
          href="/therapist"
          className="flex items-center gap-1.5 text-sm text-[#4a7c59] font-medium bg-white border border-[#c8dece] hover:bg-[#f5f0e8] px-4 py-2 rounded-lg transition-colors"
        >
          <span>←</span>
          <span>חזרה לאפליקציה</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#4a7c59] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'analytics' && (
        <AnalyticsTab days={days} patientActivity={patientActivity} totalPatients={totalPatients} />
      )}
      {activeTab === 'notifications' && (
        <NotificationsTab initialRules={notifRules} />
      )}
      {activeTab === 'templates' && (
        <TemplatesTab initialTemplates={templates} />
      )}
      {activeTab === 'settings' && (
        <SettingsTab initialSettings={settings} />
      )}
    </div>
  )
}
