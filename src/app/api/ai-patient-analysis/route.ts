import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { patientName, diary, weightLogs, goalWeight } = await req.json()

  try {
    const diaryText = diary.slice(0, 15).map((e: Record<string, unknown>) =>
      `- ${e.meal_type}: ${e.description} (${e.calories ?? '?'} קק"ל, ${e.protein ?? '?'}g חלבון, ${e.carbs ?? '?'}g פחמ׳, ${e.fat ?? '?'}g שומן)`
    ).join('\n')

    const weightText = weightLogs.map((w: Record<string, unknown>) =>
      `${w.logged_at}: ${w.weight} ק"ג`
    ).join(', ')

    const prompt = `אתה דיאטנית ונטורופתית מומחית. נתח את נתוני המטופלת ${patientName}:

ארוחות אחרונות:
${diaryText || 'אין נתוני תזונה'}

רשומות משקל: ${weightText || 'אין נתונים'}
יעד משקל: ${goalWeight ? `${goalWeight} ק"ג` : 'לא הוגדר'}

ספק ניתוח מקצועי בעברית הכולל:
1. סיכום דפוס התזונה
2. חוסרים תזונתיים אפשריים
3. נקודות חוזק
4. המלצות ספציפיות לשיפור
5. הערות על התקדמות במשקל

כתוב בגוף ראשון כאילו אתה מדברת ישירות למטפלת. היה ספציפי ומעשי.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('AI analysis error:', err)
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
  }
}
