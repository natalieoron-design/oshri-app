import { createClient } from '@supabase/supabase-js'
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

// Patient IDs from seed
const patients = {
  'מיכל כהן':   '3b4a8e88-1c53-4b59-89da-ebe880eaa7a4',
  'דנה לוי':    '342d3f4b-82f0-42f3-b0eb-e81b87272443',
  'רחל אברהם':  'b5976f99-bca0-4db1-82a4-c6621ece4c9b',
  'שרה מזרחי':  'ac1a2b5c-032d-4f9b-8dfc-3b03b23f115d',
  'נועה פרידמן': '763412f5-3ae1-4bd9-a782-39a51d847e29',
  'יעל גולדברג': 'b7da0b0f-8711-49f8-816a-ec9fd03f133d',
  'רונית שמיר':  '65d1c090-d6f8-45d1-baf8-a670be8d440e',
  'הילה בן דוד': '88c2debf-1153-4e52-9a3a-a9cda4cf3720',
  'מאיה כץ':    '428f6694-f823-4ab6-9053-01de5af49218',
  'ליאת רוזן':  '295e66c3-b3b4-45f9-9408-8e1c260be9d7',
  'תמר אלון':   '865371a8-3b62-448b-a12e-fbe873c91d70',
  'אורית פרץ':  'bb6ef524-7e57-49c2-8d0e-f2f278054902',
}

// 7 logged today, 5 didn't
const loggedToday = ['מיכל כהן', 'דנה לוי', 'שרה מזרחי', 'נועה פרידמן', 'הילה בן דוד', 'מאיה כץ', 'תמר אלון']
const notLogged   = ['רחל אברהם', 'יעל גולדברג', 'רונית שמיר', 'ליאת רוזן', 'אורית פרץ']

const today = new Date().toISOString().split('T')[0]

function todayAt(hour, min = 0) {
  return new Date(`${today}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`).toISOString()
}

async function main() {
  console.log(`📅 Seeding today's data (${today})\n`)

  // ─── 1. TODAY'S FOOD + WATER for 7 patients ───
  const todayMeals = {
    'מיכל כהן': [
      { time: 8, meal_type: 'breakfast', description: 'שיבולת שועל עם בננה, אגוזי מלך וכפית דבש', calories: 340, protein: 12, carbs: 56, fat: 9, fiber: 7 },
      { time: 13, meal_type: 'lunch',    description: 'חזה עוף צלוי עם אורז מלא וסלט ירקות טרי', calories: 520, protein: 44, carbs: 48, fat: 10, fiber: 6 },
      { time: 16, meal_type: 'snack',    description: 'יוגורט יווני עם תות וכף גרנולה', calories: 160, protein: 10, carbs: 20, fat: 4, fiber: 2 },
    ],
    'דנה לוי': [
      { time: 7, meal_type: 'breakfast', description: 'ביצים מקושקשות (3) עם גבינה ועגבניות, לחם שיפון', calories: 400, protein: 26, carbs: 28, fat: 20, fiber: 3 },
      { time: 12, meal_type: 'lunch',    description: 'מרק עדשים ביתי עם לחם מחיטה מלאה', calories: 390, protein: 18, carbs: 62, fat: 7, fiber: 13 },
      { time: 19, meal_type: 'dinner',   description: 'סלמון אפוי עם ברוקולי מאודה ובטטה', calories: 490, protein: 38, carbs: 40, fat: 18, fiber: 8 },
    ],
    'שרה מזרחי': [
      { time: 8, meal_type: 'breakfast', description: 'קערת אקאי עם פירות, גרנולה וחלב שקדים', calories: 360, protein: 8, carbs: 62, fat: 12, fiber: 8 },
      { time: 13, meal_type: 'lunch',    description: 'עוף מוקפץ עם ירקות ואטריות אורז', calories: 480, protein: 36, carbs: 52, fat: 12, fiber: 5 },
      { time: 16, meal_type: 'snack',    description: 'חופן שקדים ותמר', calories: 180, protein: 5, carbs: 22, fat: 10, fiber: 4 },
      { time: 20, meal_type: 'dinner',   description: 'תבשיל חומוס וירקות עם פיתה מחיטה מלאה', calories: 420, protein: 18, carbs: 60, fat: 12, fiber: 12 },
    ],
    'נועה פרידמן': [
      { time: 9, meal_type: 'breakfast', description: 'פנקייק כוסמין עם סירופ מייפל ופירות יער', calories: 380, protein: 14, carbs: 64, fat: 8, fiber: 6 },
      { time: 14, meal_type: 'lunch',    description: 'קינואה עם ירקות צלויים, אבוקדו וטחינה', calories: 500, protein: 16, carbs: 58, fat: 22, fiber: 11 },
      { time: 20, meal_type: 'dinner',   description: 'קרם דלעת עם שמן זית וגרעיני דלעת', calories: 280, protein: 8, carbs: 42, fat: 10, fiber: 6 },
    ],
    'הילה בן דוד': [
      { time: 7, meal_type: 'breakfast', description: 'אבוקדו טוסט על לחם שאור עם ביצה עלומה', calories: 370, protein: 16, carbs: 32, fat: 20, fiber: 8 },
      { time: 12, meal_type: 'lunch',    description: 'לוקוס בתנור עם תפוחי אדמה ורוזמרין', calories: 440, protein: 40, carbs: 36, fat: 14, fiber: 4 },
      { time: 15, meal_type: 'snack',    description: 'גזר ומלפפון עם חומוס ביתי', calories: 130, protein: 5, carbs: 18, fat: 5, fiber: 5 },
      { time: 19, meal_type: 'dinner',   description: 'מג׳דרה עדשים ואורז עם סלט ערבי', calories: 460, protein: 18, carbs: 74, fat: 10, fiber: 15 },
    ],
    'מאיה כץ': [
      { time: 8, meal_type: 'breakfast', description: 'שייק ירוק: תרד, בננה, חלב שקדים, חמאת שקדים', calories: 300, protein: 10, carbs: 44, fat: 10, fiber: 5 },
      { time: 13, meal_type: 'lunch',    description: 'מוסקה ירקות עם גבינת ריקוטה', calories: 460, protein: 22, carbs: 42, fat: 22, fiber: 8 },
      { time: 19, meal_type: 'dinner',   description: 'מרק עוף ביתי עם ירקות ואטריות כוסמין', calories: 350, protein: 26, carbs: 38, fat: 8, fiber: 4 },
    ],
    'תמר אלון': [
      { time: 7, meal_type: 'breakfast', description: 'יוגורט יווני 5% עם פירות יער ואגוזים', calories: 290, protein: 18, carbs: 28, fat: 12, fiber: 4 },
      { time: 12, meal_type: 'lunch',    description: 'סלט ניסואז עם טונה, ביצה וזיתים', calories: 420, protein: 32, carbs: 22, fat: 24, fiber: 6 },
      { time: 15, meal_type: 'snack',    description: 'בננה קפואה עם טחינה', calories: 160, protein: 4, carbs: 30, fat: 4, fiber: 3 },
      { time: 19, meal_type: 'dinner',   description: 'עוף בגריל עם ירקות בתנור ואורז בסמטי', calories: 500, protein: 42, carbs: 46, fat: 12, fiber: 5 },
    ],
  }

  const waterToday = {
    'מיכל כהן': 7, 'דנה לוי': 5, 'שרה מזרחי': 9,
    'נועה פרידמן': 8, 'הילה בן דוד': 6, 'מאיה כץ': 8, 'תמר אלון': 7,
  }

  for (const name of loggedToday) {
    const pid = patients[name]
    const meals = todayMeals[name]
    console.log(`🍽️  Adding today's meals for ${name}...`)

    const rows = meals.map(m => ({
      patient_id: pid,
      logged_at: todayAt(m.time, Math.floor(Math.random() * 30)),
      meal_type: m.meal_type,
      description: m.description,
      input_type: 'text',
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      fiber: m.fiber,
    }))

    const { error } = await supabase.from('food_diary').insert(rows)
    if (error) console.error(`  ❌ ${error.message}`)
    else console.log(`  ✓ ${rows.length} meals`)

    await supabase.from('water_intake').upsert({
      patient_id: pid,
      date: today,
      cups: waterToday[name],
    }, { onConflict: 'patient_id,date' })
    console.log(`  ✓ ${waterToday[name]} cups water`)
  }

  console.log(`\n⏭️  Skipping today for: ${notLogged.join(', ')}\n`)

  // ─── 2. PENDING AI INSIGHTS - 8 menus/recipes ───
  console.log('🤖 Adding 8 pending AI menu/recipe insights...')

  const pendingMenus = [
    {
      patient_id: patients['מיכל כהן'],
      insight_type: 'menu',
      content: `תפריט שבועי מותאם אישית למיכל כהן (יעד: 1800 קק"ל/יום)

🌅 ארוחות בוקר:
• ראשון-שלישי: שיבולת שועל עם חלב שקדים, בננה וכף חמאת בוטנים (320 קק"ל)
• רביעי-שישי: 3 ביצים מקושקשות עם ירקות + לחם שאור פרוס (360 קק"ל)
• שבת: פנקייק כוסמין עם פירות טריים (400 קק"ל)

☀️ ארוחות צהריים:
• ראשון: חזה עוף 200g + אורז מלא ½ כוס + סלט ירוק (520 קק"ל)
• שני: סלמון 180g + בטטה אפויה + ברוקולי מאודה (490 קק"ל)
• שלישי: מג׳דרה + סלט ערבי (440 קק"ל)
• רביעי: קינואה עם ירקות צלויים וטחינה (480 קק"ל)
• חמישי: מרק עדשים + 2 פרוסות לחם (380 קק"ל)
• שישי: פסטה חיטה מלאה עם רוטב עגבניות וטונה (520 קק"ל)

🌙 ארוחות ערב (קלות):
• לסירוגין: מרק ירקות, גבינה לבנה עם ירקות, ביצים מבושלות עם סלט (250-300 קק"ל)

🍎 חטיפים (בחרי 1-2 ביום):
• יוגורט יווני עם פרי (150 קק"ל)
• חופן שקדים (160 קק"ל)
• גזר + חומוס (120 קק"ל)`,
    },
    {
      patient_id: patients['דנה לוי'],
      insight_type: 'menu',
      content: `תפריט שבועי ללא גלוטן - דנה לוי (יעד: 1900 קק"ל/יום)

הערה: דנה הגבילה גלוטן - כל הפחמימות מגלוטן-פרי

🌅 בוקר (400-420 קק"ל):
• ביצים + ירקות + תפוח אדמה אפוי
• יוגורט + פירות + גרנולה ללא גלוטן
• שייק חלבון עם חלב שקדים + פירות + זרעי צ׳יה

☀️ צהריים (500-540 קק"ל):
• עוף/דג + אורז + ירקות
• קינואה עם קטניות + ירקות צלויים
• מג׳דרה (אורז + עדשים) + סלט

🌙 ערב (350-400 קק"ל):
• מרק קרמי ירקות + 2 ביצים קשות
• דג בתנור + תפוח אדמה קטן + ירקות

💡 טיפ: לשלב 30g חלבון בכל ארוחה מרכזית`,
    },
    {
      patient_id: patients['רחל אברהם'],
      insight_type: 'recipe',
      content: `🥣 מתכון: בול ארוחת בוקר-על (Super Breakfast Bowl)
מתאים לרחל - עשיר בחלבון ואנרגיה לאורך היום

⏱️ זמן הכנה: 10 דקות
🍽️ מנות: 1

מצרכים:
• ½ כוס שיבולת שועל גלגולים
• 1 כוס חלב שקדים
• 1 בננה בשלה (חצי בפנים, חצי מעל)
• 2 כפות חמאת שקדים טבעית
• ½ כוס פירות יער קפואים
• 1 כף זרעי צ׳יה
• 1 כף דבש
• קורט קינמון

הכנה:
1. לבשל את השיבולת עם חלב השקדים 3-4 דקות תוך ערבוב
2. להוסיף פנימה חצי בננה מרוסקת וזרעי צ׳יה
3. לשפוך לקערה ולסדר מעל: פירות יער, פרוסות בננה, חמאת שקדים
4. לטפטף דבש ולפזר קינמון

ערכים תזונתיים:
🔥 420 קק"ל | 💪 14g חלבון | 🌾 58g פחמימות | 🥑 16g שומן | 🌿 9g סיבים`,
    },
    {
      patient_id: patients['שרה מזרחי'],
      insight_type: 'recipe',
      content: `🥗 מתכון: סלט חורפי חם עם קינואה וירקות צלויים
מתאים לשרה - מנה מלאה ומשביעה, עשירה בסיבים

⏱️ זמן הכנה: 35 דקות
🍽️ מנות: 2

מצרכים:
• 1 כוס קינואה (2 כוסות מבושלת)
• 2 סלקים בינוניים - קלופים וחתוכים לקוביות
• 2 בטטות - קלופות וחתוכות
• 1 ראש כרובית - פרחים
• 3 כפות שמן זית
• 1 כפית כמון
• מלח, פלפל, כורכום

לרוטב:
• 3 כפות טחינה גולמית
• מיץ מ-1 לימון
• שן שום כתוש
• מים לדילול

הכנה:
1. לחמם תנור ל-200 מעלות
2. לערבב ירקות עם שמן ותבלינים, לצלות 25 דקות
3. לבשל קינואה לפי הוראות האריזה
4. לערבב רוטב טחינה עם מים עד לקרם חלק
5. לסדר: קינואה → ירקות → רוטב

ערכים (מנה): 🔥 480 קק"ל | 💪 16g חלבון | 🌾 64g פחמימות | 🥑 18g שומן | 🌿 12g סיבים`,
    },
    {
      patient_id: patients['נועה פרידמן'],
      insight_type: 'menu',
      content: `תפריט אנטי-דלקתי שבועי - נועה פרידמן (1750 קק"ל/יום)

בהתאם לצרכים של נועה - דגש על מזונות אנטי-דלקתיים, הפחתת סוכר מעובד

✅ מאכלים לשלב: כורכום, ג׳ינג׳ר, אומגה-3, אוכמניות, תרד, אגוזי מלך
❌ להימנע: סוכר לבן, קמח לבן, שמנים מהידרוגנים, מזון מעובד

📋 תפריט לדוגמה:

יום א׳:
• בוקר: שייק ירוק (תרד, ג׳ינג׳ר, כורכום, מנגו, חלב קוקוס) - 280 קק"ל
• צהריים: סלמון אפוי עם עשבי תיבול + קינואה שחורה + אספרגוס - 520 קק"ל
• חטיף: אגוזי מלך 30g + אוכמניות - 200 קק"ל
• ערב: מרק כורכום-ג׳ינג׳ר עם עדשים אדומות - 340 קק"ל

יום ב׳:
• בוקר: פודינג צ׳יה עם חלב שקדים ואנבה - 310 קק"ל
• צהריים: עוף בכורכום עם בטטה מיוחדת + כרוב - 510 קק"ל
• חטיף: סלרי עם גוואקמולי - 150 קק"ל
• ערב: תבשיל ירקות עם חומוס וקוקוס - 360 קק"ל`,
    },
    {
      patient_id: patients['יעל גולדברג'],
      insight_type: 'recipe',
      content: `🍲 מתכון: מרק עוף צלול-על ביתי
מתאים ליעל - חם, מנחם, עשיר בחלבון ומינרלים

⏱️ זמן בישול: 90 דקות
🍽️ מנות: 6

מצרכים:
• 1 עוף שלם (או 4 ירכיים עם עצם)
• 3 גזרים גדולים
• 3 גבעולי סלרי
• 2 בצלים
• 4 שיני שום
• 1 שורש פטרוזיליה
• 1 שורש סלרי קטן
• עלי דפנה, אורגנו
• מלח ים, פלפל שחור

לאגרגום (לשים בנפרד):
• 100g אטריות כוסמין
• פטרוזיליה טרייה קצוצה

הכנה:
1. להכניס עוף לסיר עם 3 ליטר מים קרים
2. להביא לרתיחה, לקלף קצף
3. להוסיף כל הירקות + תבלינים
4. לבשל על אש קטנה 75 דקות
5. להוציא עוף ולפרוק לנתחים
6. לבשל אטריות בנפרד, להוסיף לקערות לפני הגשה

ערכים (מנה): 🔥 310 קק"ל | 💪 28g חלבון | 🌾 22g פחמימות | 🥑 8g שומן`,
    },
    {
      patient_id: patients['הילה בן דוד'],
      insight_type: 'menu',
      content: `תפריט שבועי לספורטאית - הילה בן דוד (1720 קק"ל)

הילה מתאמנת 4 פעמים בשבוע - התפריט מותאם לימי אימון ומנוחה

🏃 ימי אימון (ראשון, שלישי, חמישי, שישי):
• בוקר (לפני): בננה + 1 כף חמאת שקדים (200 קק"ל)
• בוקר (אחרי): שייק חלבון עם חלב שקדים + ביצה (320 קק"ל)
• צהריים: עוף/דג 200g + אורז מלא + ירקות (520 קק"ל)
• חטיף: גבינת קוטג׳ עם פרי (180 קק"ל)
• ערב: ביצים + ירקות (250 קק"ל)
סה"כ: ~1470 קק"ל

😴 ימי מנוחה (שני, רביעי, שבת):
• בוקר: שיבולת שועל עם יוגורט (340 קק"ל)
• צהריים: סלט גדול עם חלבון (420 קק"ל)
• חטיף קטן: פרי + אגוזים (150 קק"ל)
• ערב: מרק + לחם (280 קק"ל)
סה"כ: ~1190 קק"ל

💊 תזכורת: לשתות שייק חלבון תוך 30 דקות מסיום אימון`,
    },
    {
      patient_id: patients['מאיה כץ'],
      insight_type: 'recipe',
      content: `🥘 מתכון: תבשיל עוף וירקות שורש בטעמי מרוקו
מתאים למאיה - קל להכנה, מזין ומחמם

⏱️ זמן הכנה: 20 דקות + 45 דקות בישול
🍽️ מנות: 4

מצרכים:
• 800g שוקי עוף ללא עור
• 2 בטטות - קוביות
• 3 גזרים - פרוסות
• 1 קישוא גדול
• 1 בצל
• 400ml שימורי עגבניות
• ½ כוס ציר עוף
• תבלינים: כמון, כורכום, פפריקה מתוקה, קינמון, כוסברה יבשה
• מלח, פלפל, שמן זית

הכנה:
1. לחמם שמן בסיר, לטגן בצל עד שקיפות
2. להוסיף עוף ולחרוך מכל הצדדים 5 דקות
3. להוסיף תבלינים ולערבב 1 דקה
4. להוסיף ירקות, עגבניות וציר
5. לבשל מכוסה 40 דקות על אש קטנה
6. לפזר כוסברה טרייה לפני הגשה

🍽️ להגיש עם: קוסקוס מחיטה מלאה או קינואה

ערכים (מנה): 🔥 440 קק"ל | 💪 38g חלבון | 🌾 36g פחמימות | 🥑 14g שומן`,
    },
  ]

  const { error: menuErr } = await supabase.from('ai_insights').insert(pendingMenus)
  if (menuErr) console.error(`❌ Menus error: ${menuErr.message}`)
  else console.log(`✓ 8 pending menu/recipe insights added`)

  // ─── 3. PENDING NUTRITION INSIGHTS - 3 personal observations ───
  console.log('\n💡 Adding 3 pending nutrition insights...')

  const pendingInsights = [
    {
      patient_id: patients['מיכל כהן'],
      insight_type: 'nutrition',
      content: `ניתוח תזונתי - מיכל כהן | שבוע אחרון

📊 מה שראיתי בנתונים:
מיכל צורכת בממוצע רק 68g חלבון ביום — נמוך מהיעד של 90g שהגדרנו יחד.

🔍 מה קורה:
• ארוחות הבוקר שלה עשירות בפחמימות אך דלות בחלבון
• ארוחות הצהריים טובות (עוף/דג), אבל ארוחות הערב לרוב קלות מדי
• לא רואה חלבון מספיק בחטיפים

💡 המלצה לשינוי:
1. להוסיף ביצה קשה לארוחת הבוקר
2. להחליף את חטיף הפרי ב"פרי + יוגורט יווני"
3. בערב, גם אם הארוחה קלה — לשלב 100g גבינה לבנה או 2 ביצים

📈 אם תיישם זאת: צפי להגיע ל-85-90g חלבון ביום תוך שבועיים, מה שיסייע לשמירת מסת שריר בזמן הירידה במשקל.`,
    },
    {
      patient_id: patients['דנה לוי'],
      insight_type: 'nutrition',
      content: `ניתוח שתיית מים - דנה לוי | חודש אחרון

💧 הממצאים:
דנה שותה בממוצע רק 5.2 כוסות ביום — כמחצית מהיעד של 9 כוסות שהגדרנו.

📉 מגמה מדאיגה:
• בימי עבודה (ראשון-חמישי): ממוצע 4.8 כוסות
• בסופי שבוע: ממוצע 6.1 כוסות
• לא רשמה מים כלל ב-6 ימים מהחודש האחרון

🔗 קשר לתסמינים:
צריכת מים נמוכה עלולה להסביר את התלונות על: עייפות בשעות הצהריים, קשיי ריכוז, ועצירות שדנה ציינה בפגישה האחרונה.

💡 המלצה מעשית:
• להניח בקבוק 1.5 ליטר על השולחן בבוקר — לסיים עד 14:00
• להוסיף פרוסת לימון או נענע לשיפור הטעם
• לקשור שתייה לפעולות קיימות: כוס לפני כל ארוחה, כוס אחרי כל ביקור שירותים

📱 לשקול: להציע לה להפעיל תזכורת בטלפון כל שעתיים`,
    },
    {
      patient_id: patients['רונית שמיר'],
      insight_type: 'nutrition',
      content: `תובנה כללית - רונית שמיר | דפוס תזונה

🔎 מה בולט בנתוני החודש האחרון:

✅ חוזקות:
• עקביות גבוהה — רשמה ארוחות ב-27 מתוך 30 ימים, מעולה!
• ארוחות הצהריים מגוונות ועשירות בחלבון
• שותה מים בצורה סבירה (7-8 כוסות ביום)

⚠️ נקודות לשיפור:
• ארוחות הבוקר קטנות מדי — לרוב רק קפה ופרי (200-250 קק"ל)
• "פיצוי" בערב — ארוחות ערב גדולות יחסית (700-800 קק"ל)
• חטיפים לאחר 21:00 ב-8 מהימים — לרוב פחמימות מתוקות

📊 השפעה על ירידה במשקל:
ארוחת בוקר קטנה → רעב גדול בצהריים ובערב → "זלילה" לילית. זה מסביר את הקיפאון במשקל בשבועיים האחרונים למרות מאמץ.

💡 שינוי אחד שיעשה הבדל:
להגדיל ארוחת הבוקר ל-350-400 קק"ל עם חלבון (ביצים/יוגורט). בדרך כלל זה מפחית את הרעב הלילי משמעותית.`,
    },
  ]

  const { error: insightErr } = await supabase.from('ai_insights').insert(pendingInsights)
  if (insightErr) console.error(`❌ Insights error: ${insightErr.message}`)
  else console.log(`✓ 3 pending nutrition insights added`)

  console.log('\n🎉 Done! Summary:')
  console.log(`  ✅ ${loggedToday.length} patients logged today: ${loggedToday.join(', ')}`)
  console.log(`  ⏭️  ${notLogged.length} patients skipped today: ${notLogged.join(', ')}`)
  console.log(`  🤖 8 pending AI menu/recipe insights`)
  console.log(`  💡 3 pending nutrition insights`)
}

main().catch(console.error)
