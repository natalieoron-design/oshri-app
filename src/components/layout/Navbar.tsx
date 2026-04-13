'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface NavbarProps {
  profile: Profile
}

export default function Navbar({ profile }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isTherapist = profile.role === 'therapist'

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

  const links = isTherapist ? therapistLinks : patientLinks

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <nav className="bg-[#4a7c59] text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isTherapist ? '/therapist' : '/dashboard'} className="font-bold text-lg leading-tight">
            <span className="text-[#c8dece]">אושרי הרץ</span>
            <br />
            <span className="text-xs font-normal opacity-80">רפואה משלימה</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-sm text-white/80">{profile.full_name}</span>
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
          </div>
        )}
      </div>
    </nav>
  )
}
