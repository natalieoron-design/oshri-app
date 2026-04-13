'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface NavbarProps {
  profile: Profile
  patientViewMode?: boolean
}

export default function Navbar({ profile, patientViewMode = false }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isTherapist = profile.role === 'therapist'
  // Show patient nav when: actual patient OR therapist in patient-view mode
  const showPatientNav = !isTherapist || patientViewMode

  const patientLinks = [
    { href: '/dashboard', label: 'דף הבית' },
    { href: '/diary', label: 'יומן תזונה' },
    { href: '/weight', label: 'מעקב משקל' },
    { href: '/recommendations', label: 'המלצות' },
    { href: '/messages', label: 'הודעות' },
    { href: '/shop', label: 'חנות' },
  ]

  const therapistLinks = [
    { href: '/therapist', label: 'לוח בקרה' },
    { href: '/therapist/patients', label: 'מטופלים' },
    { href: '/therapist/insights', label: 'תובנות AI' },
    { href: '/therapist/messages', label: 'הודעות' },
    { href: '/therapist/shop', label: 'חנות' },
    { href: '/admin', label: 'אדמין' },
  ]

  const links = showPatientNav ? patientLinks : therapistLinks

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const homeHref = showPatientNav ? '/dashboard' : '/therapist'

  return (
    <nav className="bg-[#4a7c59] text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={homeHref} className="font-bold text-lg leading-tight">
              <span className="text-[#c8dece]">אושרי הרץ - נטורופתית N.D</span>
              <br />
              <span className="text-xs font-normal opacity-80">רפואה משלימה</span>
            </Link>
            <a
              href="https://linktr.ee/oshrihertz"
              target="_blank"
              rel="noopener noreferrer"
              title="קישורים חברתיים"
              className="opacity-50 hover:opacity-90 transition-opacity mt-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </a>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Patient view toggle — only for therapist */}
            {isTherapist && (
              patientViewMode ? (
                <Link
                  href="/api/set-view-mode?mode=therapist"
                  className="hidden md:flex items-center gap-1.5 text-xs bg-white text-[#4a7c59] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#c8dece] transition-colors"
                >
                  <span>🔙</span>
                  <span>חזרי למצב מטפלת</span>
                </Link>
              ) : (
                <Link
                  href="/api/set-view-mode?mode=patient"
                  className="hidden md:flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 text-white font-medium px-3 py-1.5 rounded-lg transition-colors border border-white/30"
                >
                  <span>👁️</span>
                  <span>מצב מטופל</span>
                </Link>
              )
            )}

            <span className="hidden md:block text-sm text-white/70 max-w-[120px] truncate">
              {profile.full_name}
            </span>

            <button
              onClick={handleLogout}
              className="text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              יציאה
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10"
            >
              <div className="w-5 h-0.5 bg-white mb-1" />
              <div className="w-5 h-0.5 bg-white mb-1" />
              <div className="w-5 h-0.5 bg-white" />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden pb-3 flex flex-col gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10'
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile view toggle */}
            {isTherapist && (
              <Link
                href={patientViewMode ? '/api/set-view-mode?mode=therapist' : '/api/set-view-mode?mode=patient'}
                onClick={() => setMenuOpen(false)}
                className="mt-1 px-3 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/90 hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <span>{patientViewMode ? '🔙 חזרי למצב מטפלת' : '👁️ עברי למצב מטופל'}</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Patient view banner */}
      {isTherapist && patientViewMode && (
        <div className="bg-amber-500 text-white text-xs text-center py-1.5 font-medium">
          👁️ את צופה באפליקציה כמטופלת —{' '}
          <Link href="/api/set-view-mode?mode=therapist" className="underline font-bold hover:text-amber-100">
            לחצי כאן לחזרה למצב מטפלת
          </Link>
        </div>
      )}
    </nav>
  )
}
