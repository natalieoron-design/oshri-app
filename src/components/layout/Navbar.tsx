'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface NavbarProps {
  profile: Profile
  patientViewMode?: boolean
  patientViewId?: string | null
  patients?: Profile[]
}

export default function Navbar({
  profile,
  patientViewMode = false,
  patientViewId = null,
  patients = [],
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  const isTherapist = profile.role === 'therapist'
  const showPatientNav = !isTherapist || patientViewMode

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
  ]

  const links = showPatientNav ? patientLinks : therapistLinks

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const homeHref = showPatientNav ? '/dashboard' : '/therapist'

  // Current viewed patient name (for banner)
  const currentPatient = patientViewId
    ? patients.find(p => p.id === patientViewId) ?? { full_name: 'מטופלת' }
    : null

  // Patient picker dropdown (used for both entering patient view and switching while in it)
  const PatientPickerDropdown = ({ onClose }: { onClose: () => void }) => (
    <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[200px]">
      <p className="text-xs text-gray-400 px-3 py-1.5 font-medium">בחרי פרופיל מטופלת:</p>
      {patients.map(patient => (
        <a
          key={patient.id}
          href={`/api/set-view-mode?mode=patient&patient_id=${patient.id}`}
          onClick={onClose}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#f5f0e8] transition-colors',
            patientViewId === patient.id ? 'text-[#4a7c59] font-semibold bg-[#f5f0e8]' : 'text-gray-700'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-[#c8dece] flex items-center justify-center text-[#4a7c59] font-bold text-xs flex-shrink-0">
            {patient.full_name?.[0] ?? '?'}
          </div>
          <span className="truncate">{patient.full_name}</span>
          {patientViewId === patient.id && <span className="text-[#4a7c59] mr-auto">✓</span>}
        </a>
      ))}
    </div>
  )

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
            {/* Patient view controls — only for therapist */}
            {isTherapist && (
              patientViewMode ? (
                <div className="hidden md:flex items-center gap-1.5">
                  {/* Switch patient button */}
                  {patients.length > 0 && (
                    <div ref={pickerRef} className="relative">
                      <button
                        onClick={() => setPickerOpen(p => !p)}
                        className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 text-white font-medium px-3 py-1.5 rounded-lg transition-colors border border-white/30"
                      >
                        <span>👤</span>
                        <span className="max-w-[90px] truncate">{currentPatient?.full_name ?? 'מטופלת'}</span>
                        <span className="opacity-60">▾</span>
                      </button>
                      {pickerOpen && <PatientPickerDropdown onClose={() => setPickerOpen(false)} />}
                    </div>
                  )}
                  <Link
                    href="/api/set-view-mode?mode=therapist"
                    className="flex items-center gap-1.5 text-xs bg-white text-[#4a7c59] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#c8dece] transition-colors"
                  >
                    <span>🔙</span>
                    <span>מצב מטפלת</span>
                  </Link>
                </div>
              ) : (
                /* Enter patient view — show picker if patients exist */
                patients.length > 0 ? (
                  <div ref={pickerRef} className="relative hidden md:block">
                    <button
                      onClick={() => setPickerOpen(p => !p)}
                      className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 text-white font-medium px-3 py-1.5 rounded-lg transition-colors border border-white/30"
                    >
                      <span>👁️</span>
                      <span>מצב מטופל</span>
                      <span className="opacity-60">▾</span>
                    </button>
                    {pickerOpen && <PatientPickerDropdown onClose={() => setPickerOpen(false)} />}
                  </div>
                ) : (
                  <Link
                    href="/api/set-view-mode?mode=patient"
                    className="hidden md:flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 text-white font-medium px-3 py-1.5 rounded-lg transition-colors border border-white/30"
                  >
                    <span>👁️</span>
                    <span>מצב מטופל</span>
                  </Link>
                )
              )
            )}

            {/* Admin button */}
            {isTherapist && !patientViewMode && (
              <Link
                href="/admin"
                className={cn(
                  'hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                  pathname === '/admin' || pathname.startsWith('/admin/')
                    ? 'bg-white text-[#4a7c59]'
                    : 'bg-white/15 hover:bg-white/25 text-white border border-white/30'
                )}
              >
                <span>🛠️</span>
                <span>אדמין</span>
              </Link>
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

            {isTherapist && !patientViewMode && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="mt-1 px-3 py-2 rounded-lg text-sm font-semibold bg-white/15 text-white hover:bg-white/25 transition-colors flex items-center gap-2 border border-white/30"
              >
                🛠️ אדמין
              </Link>
            )}

            {isTherapist && (
              patientViewMode ? (
                <>
                  {patients.map(patient => (
                    <a
                      key={patient.id}
                      href={`/api/set-view-mode?mode=patient&patient_id=${patient.id}`}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                        patientViewId === patient.id
                          ? 'bg-white/20 text-white font-semibold'
                          : 'text-white/80 hover:bg-white/10'
                      )}
                    >
                      👤 {patient.full_name}
                      {patientViewId === patient.id && ' ✓'}
                    </a>
                  ))}
                  <Link
                    href="/api/set-view-mode?mode=therapist"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 px-3 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/90 hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    🔙 חזרי למצב מטפלת
                  </Link>
                </>
              ) : (
                patients.length > 0 ? patients.map(patient => (
                  <a
                    key={patient.id}
                    href={`/api/set-view-mode?mode=patient&patient_id=${patient.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/90 hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    👁️ מצב מטופל: {patient.full_name}
                  </a>
                )) : (
                  <Link
                    href="/api/set-view-mode?mode=patient"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 px-3 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/90 hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    👁️ עברי למצב מטופל
                  </Link>
                )
              )
            )}
          </div>
        )}
      </div>

      {/* Patient view banner */}
      {isTherapist && patientViewMode && (
        <div className="bg-amber-500 text-white text-xs text-center py-1.5 font-medium">
          👁️ את צופה כ־<strong>{currentPatient?.full_name ?? 'מטופלת'}</strong> —{' '}
          <Link href="/api/set-view-mode?mode=therapist" className="underline font-bold hover:text-amber-100">
            חזרי למצב מטפלת
          </Link>
        </div>
      )}
    </nav>
  )
}
