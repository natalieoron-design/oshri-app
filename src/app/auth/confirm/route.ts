import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // PKCE flow: Supabase redirects here with ?code=AUTH_CODE after verifying the invite
  const code = searchParams.get('code')

  // OTP flow (older Supabase versions): token_hash + type in query params
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const setPasswordUrl = `${origin}/auth/set-password`
  const errorUrl = `${origin}/auth/login?error=invalid_token`

  // Build the redirect response first so we can attach cookies to it
  const redirectResponse = NextResponse.redirect(setPasswordUrl)

  // Create Supabase client that reads from request cookies and writes to the redirect response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Handle PKCE auth code (primary path with @supabase/ssr)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return redirectResponse
    }
  }

  // Handle OTP token_hash (fallback / older flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return redirectResponse
    }
  }

  // Nothing worked — invalid or expired token
  return NextResponse.redirect(errorUrl)
}
