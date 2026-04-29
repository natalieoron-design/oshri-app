import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { description, imageBase64, audioBase64, inputType } = body

  try {
    let prompt = ''
    const messages: Anthropic.MessageParam[] = []

    const systemPrompt = `You are a nutrition analysis expert. Analyze the given food/meal and provide:
1. A description of the food in Hebrew
2. Estimated nutritional values

Always respond in this exact JSON format:
{
  "description": "תיאור הארוחה בעברית",
  "calories": 350,
  "protein": 25,
  "carbs": 40,
  "fat": 12,
  "fiber": 5,
  "notes": "הערות נוספות"
}

Be realistic with estimates. If unsure, give moderate estimates. Always respond with valid JSON only.`

    if (inputType === 'photo' && imageBase64) {
      const base64Data = imageBase64.split(',')[1] || imageBase64
      const mediaType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'

      messages.push({
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: 'נתח את המזון בתמונה ותן ערכים תזונתיים מוערכים.',
          },
        ],
      })
    } else if (inputType === 'voice' && description) {
      // Voice is transcribed client-side via Web Speech API; description is the transcript
      prompt = `המשתמש אמר בקול: "${description}". נתח את הארוחה שתיאר.`
      messages.push({ role: 'user', content: prompt })
    } else {
      prompt = `נתח את הארוחה הבאה: "${description}"`
      messages.push({
        role: 'user',
        content: prompt,
      })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response')

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('AI analysis error:', err)
    // Return default values if AI fails
    return NextResponse.json({
      description: description || 'ארוחה',
      calories: 300,
      protein: 15,
      carbs: 35,
      fat: 10,
      fiber: 3,
      notes: 'ניתוח AI לא זמין כרגע',
    })
  }
}
