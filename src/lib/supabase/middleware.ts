import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, allow all requests through
  if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith('your_')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isPublicPath =
    pathname === '/' ||
    pathname.startsWith('/auth/')

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Role-based routing
  if (user) {
    // Fetch role from profiles table — user_metadata may not be set for all accounts
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isTherapist = profile?.role === 'therapist'
    const patientViewMode = request.cookies.get('patient_view_mode')?.value === '1'

    const patientOnlyPaths = ['/diary', '/weight', '/recommendations', '/dashboard', '/messages', '/shop']
    const isPatientPath = patientOnlyPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

    // Therapist accessing patient pages without patient-view-mode cookie → send to therapist dashboard
    if (isTherapist && isPatientPath && !patientViewMode) {
      const url = request.nextUrl.clone()
      url.pathname = '/therapist'
      return NextResponse.redirect(url)
    }

    // Patient trying to access therapist pages → send to patient dashboard
    const therapistOnlyPaths = ['/therapist', '/admin']
    const isTherapistPath = therapistOnlyPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
    if (!isTherapist && isTherapistPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
