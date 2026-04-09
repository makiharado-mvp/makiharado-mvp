import Link from 'next/link'
import type { LibraryPost } from '@/types'

const BOOK_PALETTE = [
  { bg: '#6B1A1A', spine: '#3D0A0A', text: '#F0E6C8' },  // crimson
  { bg: '#1A2E4A', spine: '#0D1A2D', text: '#F0E6C8' },  // navy
  { bg: '#1A4A2E', spine: '#0D2D1A', text: '#F0E6C8' },  // forest
  { bg: '#4A2E1A', spine: '#2D1A0D', text: '#F0E6C8' },  // cognac
  { bg: '#2E1A4A', spine: '#1A0D2D', text: '#F0E6C8' },  // plum
  { bg: '#1A3A4A', spine: '#0D2230', text: '#F0E6C8' },  // teal
  { bg: '#4A3A1A', spine: '#2D220D', text: '#F0E6C8' },  // amber
  { bg: '#2E3A1A', spine: '#1A2210', text: '#F0E6C8' },  // olive
]

// Deterministic — same post always gets the same color
function bookColor(id: string) {
  const idx = parseInt(id.replace(/-/g, '').slice(-2), 16) % BOOK_PALETTE.length
  return BOOK_PALETTE[idx]
}

export default function LibraryCard({ post }: { post: LibraryPost }) {
  const color = bookColor(post.id)

  return (
    <Link
      href={`/library/${post.id}`}
      className="snap-start shrink-0 flex flex-col overflow-hidden
                 w-[110px] h-[240px]
                 hover:-translate-y-2 hover:shadow-2xl
                 transition-all duration-200"
      style={{
        background: `linear-gradient(to right, ${color.spine} 0px, ${color.spine} 10px, ${color.bg} 10px)`,
        boxShadow: '3px 3px 10px rgba(0,0,0,0.45), inset -2px 0 5px rgba(0,0,0,0.2)',
      }}
    >
      {/* Vertical spine lettering — THE key element */}
      <div className="flex-1 flex items-center justify-center overflow-hidden py-4 pl-3 pr-2">
        <p
          className="font-serif text-[10px] uppercase overflow-hidden"
          style={{
            color: color.text,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            letterSpacing: '0.18em',
            maxHeight: '190px',
          }}
        >
          {post.title}
        </p>
      </div>

      {/* Bottom imprint strip */}
      <div
        className="flex items-center justify-center py-1.5 px-2"
        style={{ background: color.spine }}
      >
        <span
          className="text-[7px] tracking-widest uppercase"
          style={{ color: color.text, opacity: 0.6 }}
        >
          {post.mid_category}
        </span>
      </div>
    </Link>
  )
}
