import Link from 'next/link'
import type { LibraryPost } from '@/types'

const BOOK_PALETTE = [
  { top: '#A02828', bottom: '#6A1616', spine: '#3C0A0A', text: '#F5F1E8' },  // crimson
  { top: '#1E4A8A', bottom: '#122E5C', spine: '#0A1C3C', text: '#EAF0F8' },  // navy
  { top: '#1A6E3C', bottom: '#0E4224', spine: '#082A16', text: '#E8F5EC' },  // forest
  { top: '#8A4418', bottom: '#5A2C0C', spine: '#361A08', text: '#F5EDD8' },  // cognac
  { top: '#6E1A8A', bottom: '#461058', spine: '#2C0A38', text: '#F0E8F8' },  // plum
  { top: '#1A6464', bottom: '#0E4040', spine: '#082828', text: '#E4F5F5' },  // teal
  { top: '#8A6A14', bottom: '#5C4410', spine: '#38280A', text: '#F8F0D8' },  // amber
  { top: '#567020', bottom: '#364814', spine: '#20300C', text: '#EEF5DC' },  // olive
  { top: '#7E182E', bottom: '#4E0E1C', spine: '#300A12', text: '#F8E4EA' },  // burgundy
  { top: '#1E5A70', bottom: '#123848', spine: '#0A2430', text: '#E0EEF5' },  // steel
]

// Deterministic — same post always gets the same style
function bookStyle(id: string) {
  const hex = id.replace(/-/g, '')
  const b = Array.from({ length: 8 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16))
  const colorIdx = parseInt(hex.slice(-2), 16) % BOOK_PALETTE.length
  return {
    color:         BOOK_PALETTE[colorIdx],
    rotation:      ((b[0] % 11) - 5) * 0.1,       // -0.5° to +0.5°
    height:        224 + (b[1] % 37),              // 224–260px
    width:         120 + (b[2] % 21),              // 120–140px
    gradientAngle: 177 + (b[3] % 7),               // 177°–183°
    shadowStr:     0.40 + (b[4] % 25) / 100,       // 0.40–0.65
    textOpacity:   0.72 + (b[5] % 26) / 100,       // 0.72–0.97
    brightness:    0.92 + (b[6] % 20) / 100,       // 0.92–1.11
    saturation:    0.82 + (b[7] % 18) / 100,       // 0.82–0.99 (wear)
    paddingTopPx:  18   + (b[0] % 32),             // 18–50px
    spineWidthPx:  5    + (b[1] % 4),              // 5–8px
  }
}

export default function LibraryCard({ post }: { post: LibraryPost }) {
  const s = bookStyle(post.id)
  const { color } = s

  return (
    // Outer wrapper handles rotation + height/width variance
    // Inner Link handles hover translateY — keeps them independent
    <div
      className="snap-start shrink-0"
      style={{
        width: s.width,
        height: s.height,
        transform: `rotate(${s.rotation}deg)`,
        transformOrigin: 'bottom center',
      }}
    >
      <Link
        href={`/library/${post.id}`}
        className="w-full h-full flex flex-col overflow-hidden
                   hover:-translate-y-1.5 transition-all duration-200"
        style={{
          background: [
            `linear-gradient(to right, ${color.spine} 0, ${color.spine} ${s.spineWidthPx}px, transparent ${s.spineWidthPx}px)`,
            `linear-gradient(${s.gradientAngle}deg, ${color.top}, ${color.bottom})`,
          ].join(', '),
          boxShadow: [
            `3px 8px 18px rgba(0,0,0,${s.shadowStr})`,                        // drop — light from top-right
            `1px 0 3px rgba(0,0,0,0.35)`,                                     // right edge shadow
            `inset -2px 0 3px rgba(245,241,232,0.12)`,                        // page-edge warm glow
            `inset ${s.spineWidthPx + 2}px 0 10px rgba(0,0,0,0.4)`,          // binding depth
            `inset 0 2px 0 rgba(255,255,255,0.08)`,                           // top rim light
          ].join(', '),
          filter: `brightness(${s.brightness}) saturate(${s.saturation})`,
        }}
      >
        {/* Spine title — shifted upward, not centered */}
        <div
          className="flex-1 flex items-start justify-center overflow-hidden px-2"
          style={{ paddingTop: s.paddingTopPx }}
        >
          <p
            className="font-serif text-[12px] uppercase overflow-hidden"
            style={{
              color: color.text,
              opacity: s.textOpacity,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              letterSpacing: '0.18em',
              maxHeight: s.height - 44,
              textShadow: '0 1px 4px rgba(0,0,0,0.65)',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {post.title}
          </p>
        </div>

        {/* Publisher strip */}
        <div
          className="flex items-center justify-center py-1.5 px-2"
          style={{ background: color.spine }}
        >
          <span
            className="text-[7px] tracking-widest uppercase"
            style={{ color: color.text, opacity: 0.45 }}
          >
            {post.mid_category}
          </span>
        </div>
      </Link>
    </div>
  )
}
