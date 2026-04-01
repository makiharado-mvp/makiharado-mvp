import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#C4A882]/20 py-6 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-[10px] tracking-widest uppercase text-[#C4A882]/60">
          Makiharado
        </p>
        <Link
          href="/privacy"
          className="text-[10px] tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  )
}
