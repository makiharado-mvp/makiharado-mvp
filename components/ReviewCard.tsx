'use client'

import { useState, useTransition } from 'react'
import { completeReview } from '@/app/actions'
import { intervalLabel } from '@/lib/reviews'
import type { Review } from '@/types'

export default function ReviewCard({ review, initialOpen }: { review: Review; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen ?? false)
  const [pending, startTransition] = useTransition()
  const [completeError, setCompleteError] = useState<string | null>(null)

  // Support both note-linked and post-linked reviews
  const source = review.notes ?? review.posts
  const title = source?.title ?? '—'
  const content = source?.content ?? null

  // Resolve image URL explicitly so silent fallthroughs are visible in the log.
  let imageUrl: string | null = null
  if (review.posts) {
    const postImages = review.posts.post_images
    if (Array.isArray(postImages) && postImages.length > 0) {
      // Sort by position ascending, use the first entry
      imageUrl = [...postImages].sort((a, b) => a.position - b.position)[0].image_url
    } else {
      // Legacy fallback: post was created before the post_images table
      imageUrl = review.posts.image_url ?? null
    }
  } else if (review.notes) {
    imageUrl = review.notes.image_url ?? null
  }


  function handleComplete() {
    setCompleteError(null)
    startTransition(async () => {
      const result = await completeReview(review.id)
      if (result?.error) {
        setCompleteError(result.error)
        return
      }
      setOpen(false)
    })
  }

  return (
    <>
      {/* Card row */}
      <div className="border border-[#C4A882]/40 bg-white p-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] tracking-widest uppercase text-[#C4A882] font-medium block mb-1">
            {intervalLabel(review.interval_day)}
          </span>
          <button
            onClick={() => setOpen(true)}
            className="text-[#1C3144] font-medium truncate w-full text-left hover:underline underline-offset-2 decoration-[#C4A882]"
          >
            {title}
          </button>
        </div>
        <button
          onClick={handleComplete}
          disabled={pending}
          className="shrink-0 text-xs tracking-widest uppercase border border-[#1C3144] text-[#1C3144] px-3 py-1.5 hover:bg-[#1C3144] hover:text-[#FAFAF7] transition-colors disabled:opacity-40"
        >
          {pending ? '...' : 'Done'}
        </button>
      </div>

      {/* Inline error shown on the card row if completeReview fails */}
      {completeError && (
        <p className="text-xs text-red-600 px-4 pb-2">{completeError}</p>
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(28,49,68,0.7)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#FAFAF7] w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between p-5 border-b border-[#C4A882]/30">
              <div>
                <span className="text-[10px] tracking-widest uppercase text-[#C4A882] block mb-1">
                  {intervalLabel(review.interval_day)}
                </span>
                <h2 className="text-[#1C3144] font-medium">{title}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[#8A7A6A] hover:text-[#1C3144] text-lg leading-none ml-4 mt-1"
              >
                ✕
              </button>
            </div>

            {/* Image */}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={title}
                className="w-full object-contain"
              />
            )}

            {/* Content */}
            {content && (
              <p className="text-sm text-[#3A3028] leading-relaxed p-5 border-t border-[#C4A882]/20">
                {content}
              </p>
            )}

            {/* Done button + error */}
            <div className="p-5 border-t border-[#C4A882]/20 space-y-2">
              {completeError && (
                <p className="text-xs text-red-600">{completeError}</p>
              )}
              <button
                onClick={handleComplete}
                disabled={pending}
                className="w-full bg-[#1C3144] text-[#FAFAF7] py-3 text-xs tracking-widest uppercase hover:bg-[#C4A882] transition-colors disabled:opacity-50"
              >
                {pending ? 'Saving...' : 'Mark as Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
