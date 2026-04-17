import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const THERAPIST_ID = '7dda24dc-e768-4816-be94-a027f6122111'
const PATIENT_EMAIL = 'natalie.oron+patient@gmail.com'
const PATIENT_PASSWORD = 'Haran1208!!'
const PATIENT_NAME = 'נתלי אורון מטופלת'

async function main() {
  console.log('יוצרת חשבון מטופלת עבור', PATIENT_NAME, '...')

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: PATIENT_EMAIL,
    password: PATIENT_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'patient', full_name: PATIENT_NAME },
  })

  if (authError) {
    console.error('שגיאה ביצירת משתמש:', authError.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log('✅ משתמש נוצר:', userId)

  // 2. Upsert profile (trigger may have already created it)
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email: PATIENT_EMAIL,
    full_name: PATIENT_NAME,
    role: 'patient',
    avatar_url: null,
    phone: null,
  }, { onConflict: 'id' })

  if (profileError) {
    console.error('שגיאה בפרופיל:', profileError.message)
  } else {
    console.log('✅ פרופיל נוצר')
  }

  // 3. Create patient_details
  const { error: detailsError } = await supabase.from('patient_details').upsert({
    patient_id: userId,
    therapist_id: THERAPIST_ID,
    goal_weight: 60,
    weigh_in_day: 1,
    daily_water_goal: 8,
    daily_calorie_goal: 1800,
    notes: 'חשבון בדיקה — נתלי אורון',
  }, { onConflict: 'patient_id' })

  if (detailsError) {
    console.error('שגיאה בפרטי מטופלת:', detailsError.message)
  } else {
    console.log('✅ פרטי מטופלת נוצרו')
  }

  console.log('\n✨ הושלם!')
  console.log('   אימייל:  ', PATIENT_EMAIL)
  console.log('   סיסמה:  ', PATIENT_PASSWORD)
  console.log('   ID:      ', userId)
}

main().catch(console.error)
