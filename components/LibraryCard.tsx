import Link from 'next/link'
import type { LibraryPost } from '@/types'

export default function LibraryCard({ post }: { post: LibraryPost }) {
  return (
    <Link
      href={`/library/${post.id}`}
      className="snap-start shrink-0 flex flex-col justify-end
                 w-[140px] h-[200px] p-3
                 bg-white border border-[#C4A882]/40
                 shadow-sm hover:shadow-md hover:scale-[1.03]
                 transition-all duration-200"
    >
      <p className="text-[#1C3144] text-xs font-medium leading-snug line-clamp-3">
        {post.title}
      </p>
    </Link>
  )
}
