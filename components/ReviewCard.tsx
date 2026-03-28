'use client'

import { useState, useTransition } from 'react'
import { completeReview } from '@/app/actions'
import { intervalLabel } from '@/lib/reviews'
import type { Review } from '@/types'

export default function ReviewCard({ review }: { review: Review }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleComplete() {
    startTransition(async () => {
      await completeReview(review.id)
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
            {review.notes?.title ?? '—'}
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
                <h2 className="text-[#1C3144] font-medium">{review.notes?.title}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[#8A7A6A] hover:text-[#1C3144] text-lg leading-none ml-4 mt-1"
              >
                ✕
              </button>
            </div>

            {/* Image */}
            {review.notes?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={review.notes.image_url}
                alt="Note image"
                className="w-full object-contain"
              />
            )}

            {/* Content */}
            {review.notes?.content && (
              <p className="text-sm text-[#3A3028] leading-relaxed p-5 border-t border-[#C4A882]/20">
                {review.notes.content}
              </p>
            )}

            {/* Done button */}
            <div className="p-5 border-t border-[#C4A882]/20">
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
