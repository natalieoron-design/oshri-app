import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, allow all requests through
  if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith('your_')) {
    return NextResponse.next({ request })
  }

  // Read patient-view cookies and inject them as request headers so Server
  // Components receive them reliably (custom cookies can get dropped when
  // supabaseResponse is recreated inside setAll).
  const patientViewMode = request.cookies.get('patient_view_mode')?.value
  const patientViewId = request.cookies.get('patient_view_id')?.value
  const requestHeaders = new Headers(request.headers)
  if (patientViewMode === '1' && patientViewId) {
    requestHeaders.set('x-patient-view-id', patientViewId)
  } else {
    requestHeaders.delete('x-patient-view-id')
  }
  const modifiedRequest = new Request(request, { headers: requestHeaders })

  let supabaseResponse = NextResponse.next({ request: modifiedRequest })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request: modifiedRequest })
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

    // Only protect therapist-only pages from non-therapist users.
    // Do NOT redirect therapists away from patient pages here — the proxy runs on
    // prefetch requests where patient_view_mode cookie may be absent, causing false
    // redirects. The navbar already prevents therapists from navigating to patient
    // pages outside of patient-view mode.
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
