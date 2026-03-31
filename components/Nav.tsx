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
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
