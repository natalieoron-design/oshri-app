import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const OSHRI_ID = '7dda24dc-e768-4816-be94-a027f6122111'

function rand(min, max) { return Math.random() * (max - min) + min }
function randInt(min, max) { return Math.floor(rand(min, max + 1)) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

const breakfasts = [
  'שיבולת שועל עם פירות יער וכפית דבש',
  'ביצים מקושקשות עם ירקות וטוסט מחיטה מלאה',
  'יוגורט יווני עם גרנולה ובננה',
  'פנקייק גבינה עם ריבת תות',
  'אבוקדו על לחם שיפון עם ביצת עין',
]
const lunches = [
  'סלט ירקות עם גבינת פטה ו-2 פרוסות לחם',
  'מרק עדשים עם לחם מחיטה מלאה',
  'אורז עם עוף בגריל וסלט',
  'פסטה עם רוטב עגבניות וירקות קלויים',
  'קינואה עם ירקות וטחינה',
]
const dinners = [
  'דג סלמון אפוי עם ברוקולי ובטטה',
  'מוקפץ עוף עם ירקות ואורז מלא',
  'מרק ירקות עם קטניות',
  'שניצל תרנגולת עם סלט כרוב',
  'עוף בתנור עם תפוחי אדמה',
]
const snacks = [
  'תפוח ו-10 שקדים',
  'גזר עם חומוס',
  'בננה',
  'יוגורט קטן',
  '2 תמרים ואגוז מלך',
]

const MEAL_MACROS = {
  breakfast: { cal: [280, 420], protein: [12, 22], carbs: [35, 55], fat: [8, 18], fiber: [4, 8] },
  lunch:     { cal: [380, 550], protein: [20, 35], carbs: [40, 65], fat: [10, 22], fiber: [6, 12] },
  dinner:    { cal: [350, 520], protein: [25, 40], carbs: [30, 55], fat: [12, 25], fiber: [5, 10] },
  snack:     { cal: [80, 160],  protein: [2, 8],   carbs: [10, 25], fat: [3, 10],  fiber: [1, 4]  },
}

function macros(type) {
  const m = MEAL_MACROS[type]
  return {
    calories: Math.round(rand(...m.cal)),
    protein:  Math.round(rand(...m.protein) * 10) / 10,
    carbs:    Math.round(rand(...m.carbs) * 10) / 10,
    fat:      Math.round(rand(...m.fat) * 10) / 10,
    fiber:    Math.round(rand(...m.fiber) * 10) / 10,
  }
}

async function main() {
  console.log('מוסיפה נתונים לאושרי הרץ...\n')

  // 1. patient_details
  const { error: detErr } = await sb.from('patient_details').upsert({
    patient_id: OSHRI_ID,
    therapist_id: null,
    goal_weight: 62,
    weigh_in_day: 0,
    daily_water_goal: 9,
    daily_calorie_goal: 1900,
    notes: null,
  }, { onConflict: 'patient_id' })
  console.log(detErr ? '❌ patient_details: ' + detErr.message : '✅ patient_details')

  const today = new Date()
  const diaryRows = []
  const waterRows = []
  const weightRows = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const skipDay = Math.random() < 0.15 // ~15% chance of skipping the day

    if (!skipDay) {
      // Food diary entries
      const meals = [
        { type: 'breakfast', hour: '07:30', descs: breakfasts },
        { type: 'lunch',     hour: '13:00', descs: lunches },
        { type: 'dinner',    hour: '19:30', descs: dinners },
      ]
      if (Math.random() < 0.6) meals.push({ type: 'snack', hour: '10:30', descs: snacks })
      if (Math.random() < 0.4) meals.push({ type: 'snack', hour: '16:00', descs: snacks })

      for (const meal of meals) {
        const m = macros(meal.type)
        diaryRows.push({
          patient_id: OSHRI_ID,
          logged_at: `${dateStr}T${meal.hour}:00`,
          meal_type: meal.type,
          description: pick(meal.descs),
          input_type: 'text',
          photo_url: null,
          voice_url: null,
          ...m,
          ai_analysis: null,
        })
      }

      // Water intake
      waterRows.push({
        patient_id: OSHRI_ID,
        date: dateStr,
        cups: randInt(5, 11),
      })
    }

    // Weight — once a week (Sunday)
    if (date.getDay() === 0) {
      const baseWeight = 71.5
      const trend = -((29 - i) * 0.03) // slow downward trend
      const noise = rand(-0.4, 0.4)
      weightRows.push({
        patient_id: OSHRI_ID,
        weight: Math.round((baseWeight + trend + noise) * 10) / 10,
        logged_at: `${dateStr}T08:00:00`,
        notes: null,
      })
    }
  }

  // Insert in batches
  const { error: dErr } = await sb.from('food_diary').insert(diaryRows)
  console.log(dErr ? '❌ food_diary: ' + dErr.message : `✅ food_diary: ${diaryRows.length} רשומות`)

  const { error: wErr } = await sb.from('water_intake').upsert(waterRows, { onConflict: 'patient_id,date' })
  console.log(wErr ? '❌ water_intake: ' + wErr.message : `✅ water_intake: ${waterRows.length} ימים`)

  const { error: wgErr } = await sb.from('weight_logs').insert(weightRows)
  console.log(wgErr ? '❌ weight_logs: ' + wgErr.message : `✅ weight_logs: ${weightRows.length} שקילות`)

  console.log('\n✨ הושלם! הנתונים של אושרי זמינים עכשיו במצב מטופל.')
}

main().catch(console.error)
