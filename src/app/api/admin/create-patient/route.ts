import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Verify caller is therapist
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { fullName, email, phone, dateOfBirth, treatmentGoals } = await req.json()

  if (!fullName || !email) {
    return NextResponse.json({ error: 'שם מלא ואימייל הם שדות חובה' }, { status: 400 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const redirectTo = appUrl + '/dashboard'

  // 1. Invite user — creates account + sends email automatically with password-setup link
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { role: 'patient', full_name: fullName },
      redirectTo,
    }
  )

  if (inviteError) {
    const msg = inviteError.message.toLowerCase().includes('already')
      ? 'כתובת האימייל כבר רשומה במערכת'
      : inviteError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const patientId = inviteData.user.id

  // 2. Upsert profile with correct name and phone
  await admin.from('profiles').upsert({
    id: patientId,
    email,
    full_name: fullName,
    role: 'patient',
    phone: phone || null,
    avatar_url: null,
  }, { onConflict: 'id' })

  // 3. Build notes from optional fields (date_of_birth column added via migration)
  const noteParts: string[] = []
  if (dateOfBirth) noteParts.push(`תאריך לידה: ${dateOfBirth}`)
  if (treatmentGoals) noteParts.push(`מטרות טיפול: ${treatmentGoals}`)

  // Try inserting with date_of_birth column; fall back without it if migration not yet run
  let detailsError = null
  const baseDetails = {
    patient_id: patientId,
    therapist_id: user.id,
    daily_water_goal: 8,
    daily_calorie_goal: 1800,
    notes: noteParts.length > 0 ? noteParts.join('\n') : null,
  }

  const withDateCol = dateOfBirth
    ? { ...baseDetails, date_of_birth: dateOfBirth, notes: treatmentGoals || null }
    : baseDetails

  const res1 = await admin.from('patient_details').insert(withDateCol)
  if (res1.error) {
    // Column may not exist yet — retry without it
    if (res1.error.message.includes('date_of_birth') || res1.error.message.includes('schema cache')) {
      const res2 = await admin.from('patient_details').insert(baseDetails)
      detailsError = res2.error
    } else {
      detailsError = res1.error
    }
  }

  if (detailsError) {
    await admin.auth.admin.deleteUser(patientId)
    return NextResponse.json({ error: 'שגיאה ביצירת פרופיל מטופל: ' + detailsError.message }, { status: 500 })
  }

  return NextResponse.json({ userId: patientId, emailSent: true })
}
