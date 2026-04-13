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

  const { patientId, prompt: customPrompt } = await req.json()

  // Get patient details and recent diary
  const [detailsRes, diaryRes, patientRes] = await Promise.all([
    supabase.from('patient_details').select('*').eq('patient_id', patientId).single(),
    supabase.from('food_diary').select('*').eq('patient_id', patientId)
      .gte('logged_at', new Date(Date.now() - 14 * 86400000).toISOString())
      .order('logged_at', { ascending: false })
      .limit(20),
    supabase.from('profiles').select('full_name').eq('id', patientId).single(),
  ])

  const details = detailsRes.data
  const diary = diaryRes.data ?? []
  const patientName = patientRes.data?.full_name ?? 'המטופלת'

  try {
    const commonFoods = diary.slice(0, 10).map((e: Record<string, unknown>) => e.description).join(', ')

    const systemPrompt = `אתה נטורופת ודיאטנית מומחית שכותבת תפריטים בריאים ומותאמים אישית בעברית.`

    const userPrompt = `צור תפריט שבועי מפורט עבור ${patientName}.

נתונים:
- יעד קלוריות יומי: ${details?.daily_calorie_goal ?? 2000} קק"ל
- מאכלים שאוהבת: ${commonFoods || 'לא ידוע'}
${customPrompt ? `- הוראות מיוחדות: ${customPrompt}` : ''}

כתוב תפריט שבועי מלא (ראשון עד שישי) שכולל:
- ארוחת בוקר
- ארוחת צהריים
- ארוחת ערב
- חטיפים

עבור כל ארוחה: ציין קלוריות משוערות וערכים תזונתיים עיקריים.
כתוב בצורה ידידותית וברורה. כלול גם טיפים קטנים.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const menu = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ menu })
  } catch (err) {
    console.error('Menu generation error:', err)
    return NextResponse.json({ error: 'Menu generation failed' }, { status: 500 })
  }
}
