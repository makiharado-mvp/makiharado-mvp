'use client'

import type { Post } from '@/types'

export default function PostModal({
  post,
  onClose,
}: {
  post: Post
  onClose: () => void
}) {
  const date = new Date(post.post_date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(28,49,68,0.75)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#FAFAF7] w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#C4A882]/30">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-[#C4A882] mb-1">{date}</p>
            <h2 className="text-[#1C3144] text-lg">{post.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A7A6A] hover:text-[#1C3144] text-lg leading-none ml-4 mt-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Image */}
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full object-contain"
          />
        )}

        {/* Content */}
        {post.content && (
          <div className="p-5 border-t border-[#C4A882]/20">
            <p className="text-sm text-[#3A3028] leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
