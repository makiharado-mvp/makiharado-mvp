import Link from 'next/link'
import type { LibraryPost } from '@/types'

export default function LibraryCard({ post }: { post: LibraryPost }) {
  const coverImage = post.library_images
    ?.slice()
    .sort((a, b) => a.position - b.position)[0]?.image_url ?? null

  return (
    <Link
      href={`/library/${post.id}`}
      className="block border border-[#C4A882]/30 bg-white hover:border-[#C4A882] transition-colors"
    >
      {coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt={post.title}
          className="w-full h-48 object-cover border-b border-[#C4A882]/20"
        />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest uppercase text-[#C4A882]">
            {post.category}
          </span>
        </div>
        <h2 className="text-[#1C3144] text-sm font-medium leading-snug line-clamp-2">
          {post.title}
        </h2>
        <p className="text-[#8A7A6A] text-xs leading-relaxed line-clamp-3">
          {post.content}
        </p>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {post.tags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className="text-[10px] tracking-wide text-[#8A7A6A] border border-[#C4A882]/30 px-1.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[#C4A882]/60 pt-1">
          {new Date(post.created_at).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      </div>
    </Link>
  )
}
