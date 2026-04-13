import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = join(__dirname, '..', '.env.local')
try {
  const env = readFileSync(envFile, 'utf8')
  env.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  })
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const patients = [
  { name: 'מיכל כהן',    email: 'michal.cohen@test.com',   startWeight: 78, goalWeight: 65, calorieGoal: 1800 },
  { name: 'דנה לוי',     email: 'dana.levi@test.com',      startWeight: 82, goalWeight: 70, calorieGoal: 1900 },
  { name: 'רחל אברהם',   email: 'rachel.avraham@test.com', startWeight: 91, goalWeight: 75, calorieGoal: 2000 },
  { name: 'שרה מזרחי',   email: 'sara.mizrachi@test.com',  startWeight: 68, goalWeight: 60, calorieGoal: 1700 },
  { name: 'נועה פרידמן',  email: 'noa.fridman@test.com',    startWeight: 74, goalWeight: 63, calorieGoal: 1750 },
  { name: 'יעל גולדברג',  email: 'yael.goldberg@test.com',  startWeight: 86, goalWeight: 72, calorieGoal: 1950 },
  { name: 'רונית שמיר',   email: 'ronit.shamir@test.com',   startWeight: 95, goalWeight: 80, calorieGoal: 2100 },
  { name: 'הילה בן דוד',  email: 'hila.bendavid@test.com',  startWeight: 71, goalWeight: 62, calorieGoal: 1720 },
  { name: 'מאיה כץ',     email: 'maya.katz@test.com',      startWeight: 79, goalWeight: 67, calorieGoal: 1850 },
  { name: 'ליאת רוזן',   email: 'liat.rosen@test.com',     startWeight: 88, goalWeight: 74, calorieGoal: 2000 },
  { name: 'תמר אלון',    email: 'tamar.alon@test.com',     startWeight: 66, goalWeight: 58, calorieGoal: 1680 },
  { name: 'אורית פרץ',   email: 'orit.peretz@test.com',    startWeight: 93, goalWeight: 78, calorieGoal: 2050 },
]

const breakfastOptions = [
  { desc: 'שיבולת שועל עם פירות יער ודבש', cal: 320, prot: 12, carbs: 55, fat: 6, fiber: 8 },
  { desc: 'ביצים מקושקשות עם ירקות וטוסט מחיטה מלאה', cal: 380, prot: 22, carbs: 30, fat: 18, fiber: 4 },
  { desc: 'יוגורט יווני עם גרנולה ותותים', cal: 290, prot: 18, carbs: 38, fat: 7, fiber: 3 },
  { desc: 'פנקייק כוסמין עם מייפל וקינמון', cal: 420, prot: 14, carbs: 68, fat: 10, fiber: 5 },
  { desc: 'אבוקדו טוסט עם ביצה קשה', cal: 350, prot: 16, carbs: 28, fat: 20, fiber: 7 },
  { desc: 'שייק בננה ספירולינה עם חלב שקדים', cal: 280, prot: 10, carbs: 48, fat: 6, fiber: 4 },
  { desc: 'גבינה לבנה עם ירקות ולחם שאור', cal: 310, prot: 20, carbs: 32, fat: 10, fiber: 3 },
]

const lunchOptions = [
  { desc: 'סלט קינואה עם ירקות צלויים וטחינה', cal: 480, prot: 16, carbs: 62, fat: 18, fiber: 9 },
  { desc: 'חזה עוף בגריל עם אורז מלא וברוקולי', cal: 520, prot: 42, carbs: 48, fat: 12, fiber: 6 },
  { desc: 'מרק עדשים עם לחם שיפון', cal: 380, prot: 18, carbs: 58, fat: 8, fiber: 12 },
  { desc: 'פסטה חיטה מלאה עם רוטב עגבניות וטונה', cal: 540, prot: 32, carbs: 72, fat: 14, fiber: 8 },
  { desc: 'עוף מוקפץ עם ירקות ואטריות אורז', cal: 490, prot: 36, carbs: 55, fat: 13, fiber: 5 },
  { desc: 'בורגר קינואה עם סלט ירקות', cal: 460, prot: 22, carbs: 58, fat: 16, fiber: 10 },
  { desc: 'דג סלמון אפוי עם בטטה וסלט ירוק', cal: 510, prot: 38, carbs: 42, fat: 20, fiber: 7 },
  { desc: 'מג׳דרה עם סלט ערבי', cal: 440, prot: 16, carbs: 72, fat: 10, fiber: 14 },
]

const dinnerOptions = [
  { desc: 'מרק ירקות עם קציצות בשר וכוסמת', cal: 420, prot: 28, carbs: 45, fat: 14, fiber: 8 },
  { desc: 'אנטריקוט צלוי עם ירקות בתנור', cal: 580, prot: 48, carbs: 20, fat: 32, fiber: 5 },
  { desc: 'תבשיל חומוס עם ביצים ועגבניות', cal: 390, prot: 22, carbs: 44, fat: 14, fiber: 10 },
  { desc: 'לוקוס בתנור עם עשבי תיבול ולימון', cal: 340, prot: 42, carbs: 12, fat: 14, fiber: 2 },
  { desc: 'מוסקה ירקות עם גבינת ריקוטה', cal: 450, prot: 24, carbs: 38, fat: 22, fiber: 7 },
  { desc: 'קרם דלעת עם טוסט מחיטה מלאה', cal: 310, prot: 10, carbs: 52, fat: 8, fiber: 6 },
  { desc: 'עוף שלם אפוי עם תפוחי אדמה ובצל', cal: 540, prot: 44, carbs: 38, fat: 22, fiber: 4 },
]

const snackOptions = [
  { desc: 'תפוח עם כפית חמאת שקדים', cal: 180, prot: 4, carbs: 28, fat: 8, fiber: 4 },
  { desc: 'חופן אגוזים מעורבים', cal: 160, prot: 5, carbs: 8, fat: 14, fiber: 2 },
  { desc: 'גזר עם חומוס', cal: 120, prot: 5, carbs: 18, fat: 4, fiber: 5 },
  { desc: 'בננה', cal: 100, prot: 1, carbs: 26, fat: 0, fiber: 3 },
  { desc: 'יוגורט עם פירות', cal: 150, prot: 8, carbs: 22, fat: 3, fiber: 2 },
  { desc: 'עוגיית שיבולת שועל תוצרת בית', cal: 140, prot: 4, carbs: 20, fat: 5, fiber: 3 },
]

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function dateStr(date) {
  return date.toISOString().split('T')[0]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  console.log('🌱 Starting seed...\n')

  const today = new Date()
  const monthAgo = addDays(today, -30)

  for (const patient of patients) {
    console.log(`👤 Creating ${patient.name}...`)

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: patient.email,
      password: 'Test1234!!',
      email_confirm: true,
      user_metadata: { full_name: patient.name, role: 'patient' }
    })

    if (authError) {
      console.error(`  ❌ Auth error: ${authError.message}`)
      continue
    }

    const userId = authData.user.id
    console.log(`  ✓ User created: ${userId}`)

    // 2. Set profile role
    await supabase.from('profiles').update({
      role: 'patient',
      full_name: patient.name
    }).eq('id', userId)

    // 3. Create patient details
    const weighInDay = randomInt(0, 6)
    await supabase.from('patient_details').upsert({
      patient_id: userId,
      therapist_id: THERAPIST_ID,
      goal_weight: patient.goalWeight,
      weigh_in_day: weighInDay,
      daily_calorie_goal: patient.calorieGoal,
      daily_water_goal: randomInt(7, 10),
      notes: `מטופלת מגיעה לטיפול בשל ${randomFrom(['ירידה במשקל', 'בעיות עיכול', 'חיזוק מערכת החיסון', 'עייפות כרונית'])}`
    }, { onConflict: 'patient_id' })

    console.log(`  ✓ Patient details set`)

    // 4. Daily food diary + water - every day for past 30 days
    const diaryRows = []
    const waterRows = []

    for (let d = 0; d < 30; d++) {
      const date = addDays(monthAgo, d)
      const dateString = dateStr(date)
      const skipDay = Math.random() < 0.1 // 10% chance skip a day

      if (skipDay) continue

      // Breakfast
      const bf = randomFrom(breakfastOptions)
      diaryRows.push({
        patient_id: userId,
        logged_at: new Date(date.setHours(8, randomInt(0,45))).toISOString(),
        meal_type: 'breakfast',
        description: bf.desc,
        input_type: 'text',
        calories: bf.cal + randomInt(-20, 20),
        protein: bf.prot,
        carbs: bf.carbs,
        fat: bf.fat,
        fiber: bf.fiber,
      })

      // Lunch
      const ln = randomFrom(lunchOptions)
      diaryRows.push({
        patient_id: userId,
        logged_at: new Date(date.setHours(13, randomInt(0,59))).toISOString(),
        meal_type: 'lunch',
        description: ln.desc,
        input_type: randomFrom(['text', 'text', 'photo']),
        calories: ln.cal + randomInt(-30, 30),
        protein: ln.prot,
        carbs: ln.carbs,
        fat: ln.fat,
        fiber: ln.fiber,
      })

      // Dinner
      const dn = randomFrom(dinnerOptions)
      diaryRows.push({
        patient_id: userId,
        logged_at: new Date(date.setHours(19, randomInt(0,59))).toISOString(),
        meal_type: 'dinner',
        description: dn.desc,
        input_type: 'text',
        calories: dn.cal + randomInt(-30, 30),
        protein: dn.prot,
        carbs: dn.carbs,
        fat: dn.fat,
        fiber: dn.fiber,
      })

      // Snack (70% chance)
      if (Math.random() > 0.3) {
        const sn = randomFrom(snackOptions)
        diaryRows.push({
          patient_id: userId,
          logged_at: new Date(date.setHours(16, randomInt(0,59))).toISOString(),
          meal_type: 'snack',
          description: sn.desc,
          input_type: 'text',
          calories: sn.cal,
          protein: sn.prot,
          carbs: sn.carbs,
          fat: sn.fat,
          fiber: sn.fiber,
        })
      }

      // Water intake
      waterRows.push({
        patient_id: userId,
        date: dateString,
        cups: randomInt(4, 10),
      })
    }

    // Insert diary in batches of 50
    for (let i = 0; i < diaryRows.length; i += 50) {
      const batch = diaryRows.slice(i, i + 50)
      const { error } = await supabase.from('food_diary').insert(batch)
      if (error) console.error(`  ❌ Diary batch error: ${error.message}`)
    }
    console.log(`  ✓ ${diaryRows.length} diary entries`)

    // Insert water
    const { error: waterErr } = await supabase.from('water_intake').insert(waterRows)
    if (waterErr) console.error(`  ❌ Water error: ${waterErr.message}`)
    else console.log(`  ✓ ${waterRows.length} water records`)

    // 5. Weekly weight logs - every 7 days with gradual loss
    const weightRows = []
    let currentWeight = patient.startWeight + randomInt(0, 3)

    for (let week = 0; week < 5; week++) {
      const date = addDays(monthAgo, week * 7)
      // Mostly lose weight, occasionally stay or gain slightly
      const change = randomFrom([-0.8, -0.6, -0.4, -0.5, -0.3, 0, 0.2, -0.7, -1.0, -0.6])
      currentWeight = Math.round((currentWeight + change) * 10) / 10

      weightRows.push({
        patient_id: userId,
        weight: currentWeight,
        logged_at: dateStr(date),
        notes: week === 0 ? 'משקל התחלתי' : null,
      })
    }

    const { error: weightErr } = await supabase.from('weight_logs').insert(weightRows)
    if (weightErr) console.error(`  ❌ Weight error: ${weightErr.message}`)
    else console.log(`  ✓ ${weightRows.length} weight records`)

    // 6. Add a recommendation
    const recTypes = ['nutrition', 'supplement', 'exercise', 'general']
    const recs = [
      {
        patient_id: userId,
        therapist_id: THERAPIST_ID,
        type: 'nutrition',
        title: 'הגדלת צריכת חלבון',
        content: 'לשלב חלבון בכל ארוחה. מקורות מומלצים: ביצים, גבינה, קטניות, דגים. יעד: 80-100 גרם חלבון ביום.',
        is_active: true,
      },
      {
        patient_id: userId,
        therapist_id: THERAPIST_ID,
        type: 'supplement',
        title: 'ויטמין D + מגנזיום',
        content: 'ויטמין D3 - 2000 יחב"ל ביום עם ארוחה שמנה. מגנזיום גליצינט - 300 מ"ג לפני השינה לשיפור שינה ולחיזוק השרירים.',
        is_active: true,
      },
      {
        patient_id: userId,
        therapist_id: THERAPIST_ID,
        type: 'exercise',
        title: 'הליכה יומית',
        content: 'לפחות 30 דקות הליכה ביום בקצב בינוני. אפשר לחלק ל-3 × 10 דקות. להוסיף 2 אימוני כוח בשבוע.',
        is_active: true,
      },
    ]

    await supabase.from('recommendations').insert(recs)
    console.log(`  ✓ Recommendations added`)

    // 7. Add an approved AI insight
    await supabase.from('ai_insights').insert({
      patient_id: userId,
      content: `בהתבסס על יומן התזונה של ${patient.name} בחודש האחרון, ניתן לראות דפוס תזונה עקבי יחסית. צריכת הפחמימות גבוהה מעט בערבים - מומלץ להקטין את גודל הארוחה האחרונה ולהגדיל את ארוחת הבוקר. שתיית המים טובה ברוב הימים. המשקל יורד בהדרגה - כל הכבוד! המשיכי לשמור על העקביות.`,
      insight_type: 'nutrition',
      status: 'approved',
      reviewed_by: THERAPIST_ID,
      reviewed_at: new Date().toISOString(),
      therapist_notes: 'תובנה מדויקת, מאשרת לשליחה',
    })
    console.log(`  ✓ AI insight added`)

    console.log(`  ✅ ${patient.name} done!\n`)
    await sleep(300)
  }

  console.log('🎉 All 12 patients seeded successfully!')
}

main().catch(console.error)
