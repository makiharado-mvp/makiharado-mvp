import Link from 'next/link'
import type { LibraryPost } from '@/types'

const BOOK_PALETTE = [
  { top: '#7A1E1E', bottom: '#2E0808', spine: '#1A0404', text: '#F5F1E8' },  // crimson
  { top: '#1E3455', bottom: '#091525', spine: '#050D17', text: '#F0EDE4' },  // navy
  { top: '#1A4D30', bottom: '#092018', spine: '#050F0C', text: '#EBF2E8' },  // forest
  { top: '#5A3018', bottom: '#261408', spine: '#140A04', text: '#F5F0E0' },  // cognac
  { top: '#36185A', bottom: '#160924', spine: '#0C0514', text: '#EDE8F5' },  // plum
  { top: '#183C50', bottom: '#091820', spine: '#040C12', text: '#E4EEF5' },  // teal
  { top: '#5A4018', bottom: '#241A07', spine: '#120D03', text: '#F5EDD8' },  // amber
  { top: '#303818', bottom: '#141808', spine: '#0A0C04', text: '#E8F0DC' },  // olive
  { top: '#4A1E20', bottom: '#1C0A0C', spine: '#100508', text: '#F5E8E8' },  // burgundy
  { top: '#1E3C3C', bottom: '#0A1818', spine: '#050E0E', text: '#E4F5F0' },  // slate
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
    shadowStr:     0.45 + (b[4] % 30) / 100,       // 0.45–0.74
    textOpacity:   0.72 + (b[5] % 26) / 100,       // 0.72–0.97
    brightness:    0.84 + (b[6] % 32) / 100,       // 0.84–1.15
    saturation:    0.72 + (b[7] % 28) / 100,       // 0.72–0.99 (wear)
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
            className="font-serif text-[11px] uppercase overflow-hidden"
            style={{
              color: color.text,
              opacity: s.textOpacity,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              letterSpacing: '0.2em',
              maxHeight: s.height - 44,
              textShadow: '0 1px 4px rgba(0,0,0,0.65)',
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
