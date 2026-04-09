import Link from 'next/link'
import { signOut } from '@/app/actions'

export default function Nav({ email }: { email: string }) {
  void email
  return (
    <nav className="border-b border-[#C4A882]/30 bg-[#FAFAF7]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-serif text-[#1C3144] text-lg tracking-widest uppercase"
        >
          Makiharado
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="text-xs tracking-widest uppercase text-[#C4A882]/60 hover:text-[#8A7A6A] transition-colors"
          >
            Home
          </Link>
          <Link
            href="/library"
            className="text-xs tracking-widest uppercase text-[#C4A882]/60 hover:text-[#8A7A6A] transition-colors"
          >
            Library
          </Link>
          <Link
            href="/settings"
            className="text-xs tracking-widest uppercase text-[#C4A882]/60 hover:text-[#8A7A6A] transition-colors"
          >
            Settings
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
