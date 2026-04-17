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

  // 1. Create auth user (no password — link will be sent for setup)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: 'patient', full_name: fullName },
  })

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'כתובת האימייל כבר רשומה במערכת'
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const patientId = authData.user.id

  // 2. Upsert profile (trigger may have already created it)
  await admin.from('profiles').upsert({
    id: patientId,
    email,
    full_name: fullName,
    role: 'patient',
    phone: phone || null,
    avatar_url: null,
  }, { onConflict: 'id' })

  // 3. Create patient_details linked to this therapist
  const { error: detailsError } = await admin.from('patient_details').insert({
    patient_id: patientId,
    therapist_id: user.id,
    daily_water_goal: 8,
    daily_calorie_goal: 1800,
    phone: phone || null,
    date_of_birth: dateOfBirth || null,
    treatment_goals: treatmentGoals || null,
  })

  if (detailsError) {
    // Rollback: delete the created auth user
    await admin.auth.admin.deleteUser(patientId)
    return NextResponse.json({ error: 'שגיאה ביצירת פרופיל מטופל: ' + detailsError.message }, { status: 500 })
  }

  // 4. Generate password-setup link (recovery type)
  const redirectTo = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/dashboard'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (linkError) {
    return NextResponse.json({
      userId: patientId,
      link: null,
      warning: 'המטופל נוצר אך לא ניתן ליצור קישור: ' + linkError.message,
    })
  }

  return NextResponse.json({
    userId: patientId,
    link: linkData.properties.action_link,
  })
}
