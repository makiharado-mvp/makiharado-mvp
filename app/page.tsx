import Link from 'next/link'

export const metadata = {
  title: 'Makiharado',
  description: 'Japanese stationery meets learning science.',
}

const LINKS = [
  {
    label: 'Makiharado',
    sublabel: 'Notes · Reviews · Diary',
    href: '/dashboard',
    external: false,
    status: 'live' as const,
    prominent: true,
  },
  {
    label: 'YouTube',
    sublabel: 'Videos',
    href: 'https://youtube.com/channel/UCFgYODWffdmFWqMngx9n0Ag?si=zSUikAnHsS-4WpHI',
    external: true,
    status: 'live' as const,
    prominent: false,
  },
  {
    label: 'Instagram',
    sublabel: 'Photos & updates',
    href: 'https://www.instagram.com/mai_story_4u_?igsh=OGQ5ZDc2ODk2ZA==',
    external: true,
    status: 'live' as const,
    prominent: false,
  },
  {
    label: 'TikTok Shop',
    sublabel: 'Japanese stationery',
    href: null,
    external: true,
    status: 'soon' as const,
    prominent: false,
  },
  {
    label: 'Etsy',
    sublabel: 'Handcrafted goods',
    href: null,
    external: true,
    status: 'soon' as const,
    prominent: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF7' }}>

      {/* Hero */}
      <header className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <p className="text-[10px] tracking-[8px] uppercase text-[#C4A882] mb-6">
          Japanese Stationery
        </p>
        <h1
          className="text-5xl sm:text-6xl text-[#1C3144] mb-6 leading-none tracking-tight"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Makiharado
        </h1>
        <p className="text-sm text-[#8A7A6A] leading-relaxed max-w-xs">
          Handwritten notes. Spaced repetition. Craft that helps you remember.
        </p>
      </header>

      {/* Divider */}
      <div className="w-16 h-px bg-[#C4A882]/40 mx-auto" />

      {/* Links */}
      <main className="px-6 py-16">
        <div className="max-w-sm mx-auto space-y-3">
          {LINKS.map(link => {
            if (link.status === 'soon') {
              return (
                <div
                  key={link.label}
                  className="flex items-center justify-between px-5 py-4 border border-[#C4A882]/20 bg-white/60"
                >
                  <div>
                    <p className="text-sm text-[#8A7A6A]/60">{link.label}</p>
                    <p className="text-[10px] text-[#C4A882]/50 mt-0.5">{link.sublabel}</p>
                  </div>
                  <span className="text-[10px] tracking-widest uppercase text-[#C4A882]/50">
                    Coming soon
                  </span>
                </div>
              )
            }

            const inner = (
              <>
                <div>
                  <p
                    className={[
                      'text-sm',
                      link.prominent ? 'text-[#FAFAF7]' : 'text-[#1C3144]',
                    ].join(' ')}
                  >
                    {link.label}
                  </p>
                  <p
                    className={[
                      'text-[10px] mt-0.5',
                      link.prominent ? 'text-[#C4A882]/80' : 'text-[#8A7A6A]',
                    ].join(' ')}
                  >
                    {link.sublabel}
                  </p>
                </div>
                <span
                  className={[
                    'text-[10px] tracking-widest uppercase',
                    link.prominent ? 'text-[#C4A882]' : 'text-[#C4A882]',
                  ].join(' ')}
                >
                  →
                </span>
              </>
            )

            const className = [
              'flex items-center justify-between px-5 py-4 border transition-colors',
              link.prominent
                ? 'bg-[#1C3144] border-[#1C3144] hover:bg-[#16273a]'
                : 'bg-white border-[#C4A882]/30 hover:border-[#C4A882]',
            ].join(' ')

            if (link.external) {
              return (
                <a
                  key={link.label}
                  href={link.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {inner}
                </a>
              )
            }

            return (
              <Link key={link.label} href={link.href!} className={className}>
                {inner}
              </Link>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-[10px] tracking-widest uppercase text-[#C4A882]/40">
          © {new Date().getFullYear()} Makiharado
        </p>
      </footer>

    </div>
  )
}
