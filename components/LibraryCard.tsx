import Link from 'next/link'
import type { LibraryPost } from '@/types'

const BOOK_PALETTE = [
  { top: '#7A1E1E', bottom: '#3D0A0A', spine: '#2A0606', text: '#F0E6C8' },  // crimson
  { top: '#1E3455', bottom: '#0D1A2D', spine: '#080F1C', text: '#EDE8DA' },  // navy
  { top: '#1E5234', bottom: '#0D2D1A', spine: '#071A0E', text: '#EAF0E6' },  // forest
  { top: '#5A3520', bottom: '#2D1A0D', spine: '#1A0E06', text: '#F0E6C8' },  // cognac
  { top: '#3A1E5A', bottom: '#1A0D2D', spine: '#0F0619', text: '#EDE8DA' },  // plum
  { top: '#1E4455', bottom: '#0D2230', spine: '#06121A', text: '#E6EFF0' },  // teal
  { top: '#5A4520', bottom: '#2D220D', spine: '#1A1306', text: '#F0EAC8' },  // amber
  { top: '#384520', bottom: '#1A2210', spine: '#0E1308', text: '#EAF0E0' },  // olive
  { top: '#4A2020', bottom: '#220D0D', spine: '#160707', text: '#F0E6C8' },  // burgundy
  { top: '#204545', bottom: '#0D2222', spine: '#071414', text: '#E6F0EE' },  // slate
]

// Deterministic — same post always gets the same style
function bookStyle(id: string) {
  const hex = id.replace(/-/g, '')
  const colorIdx       = parseInt(hex.slice(-2), 16) % BOOK_PALETTE.length
  const b0             = parseInt(hex.slice(0, 2), 16)
  const b1             = parseInt(hex.slice(2, 4), 16)
  const b2             = parseInt(hex.slice(4, 6), 16)
  const b3             = parseInt(hex.slice(6, 8), 16)
  return {
    color:         BOOK_PALETTE[colorIdx],
    gradientAngle: 180 + (b0 % 10) - 5,           // 175°–185°
    shadowStr:     0.50 + (b1 % 25) / 100,         // 0.50–0.75
    textOpacity:   0.78 + (b2 % 20) / 100,         // 0.78–0.98
    brightness:    0.88 + (b3 % 28) / 100,         // 0.88–1.16
    paddingTopPx:  22   + (b0 % 24),               // 22–46px
  }
}

export default function LibraryCard({ post }: { post: LibraryPost }) {
  const style = bookStyle(post.id)
  const { color } = style

  return (
    <Link
      href={`/library/${post.id}`}
      className="snap-start shrink-0 flex flex-col overflow-hidden
                 w-[110px] h-[240px]
                 hover:-translate-y-2 hover:shadow-2xl
                 transition-all duration-200"
      style={{
        background: [
          `linear-gradient(to right, ${color.spine} 0px, ${color.spine} 10px, transparent 10px)`,
          `linear-gradient(${style.gradientAngle}deg, ${color.top}, ${color.bottom})`,
        ].join(', '),
        boxShadow: [
          `4px 4px 14px rgba(0,0,0,${style.shadowStr})`,
          `1px 0 3px rgba(0,0,0,0.4)`,
          `inset -2px 0 0 rgba(255,255,255,0.13)`,
          `inset 4px 0 10px rgba(0,0,0,0.35)`,
          `inset 0 1px 0 rgba(255,255,255,0.09)`,
        ].join(', '),
        filter: `brightness(${style.brightness})`,
      }}
    >
      {/* Vertical spine lettering — THE key element */}
      <div className="flex-1 flex items-start justify-center overflow-hidden pr-2 pl-3"
           style={{ paddingTop: style.paddingTopPx }}>
        <p
          className="font-serif text-[11px] uppercase overflow-hidden"
          style={{
            color: color.text,
            opacity: style.textOpacity,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            letterSpacing: '0.22em',
            maxHeight: '190px',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
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
