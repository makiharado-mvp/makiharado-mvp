import Link from 'next/link'
import { signOut } from '@/app/actions'

export default function Nav({ email }: { email: string }) {
  return (
    <nav className="border-b border-[#C4A882]/30 bg-[#FAFAF7]">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-serif text-[#1C3144] text-lg tracking-widest uppercase">
          Makiharado
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/calendar"
            className="text-xs tracking-widest uppercase text-[#1C3144] hover:text-[#C4A882] transition-colors"
          >
            Calendar
          </Link>
          <Link
            href="/notes/new"
            className="text-xs tracking-widest uppercase text-[#FAFAF7] bg-[#1C3144] px-4 py-2 hover:bg-[#C4A882] transition-colors"
          >
            + New Note
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
