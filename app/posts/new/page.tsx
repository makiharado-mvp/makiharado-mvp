'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createPost } from '@/app/actions'

export default function NewPostPage() {
  const [state, action, pending] = useActionState(createPost, undefined)
  const params = useSearchParams()
  const defaultDate = params.get('date') ?? new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs tracking-[6px] uppercase text-[#C4A882] mb-1">Makiharado</p>
            <h1 className="text-xl text-[#1C3144]">New Post</h1>
          </div>
          <Link
            href="/calendar"
            className="text-xs tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
          >
            ← Calendar
          </Link>
        </div>

        <form action={action} className="space-y-6">
          {/* Date */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              name="post_date"
              type="date"
              required
              defaultValue={defaultDate}
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882]"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Morning reflection"
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882] placeholder:text-[#C4A882]/40"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Content
            </label>
            <textarea
              name="content"
              rows={5}
              placeholder="Write your post here..."
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882] placeholder:text-[#C4A882]/40 resize-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Image
              <span className="normal-case tracking-normal text-[#C4A882] ml-1">(optional)</span>
            </label>
            <input
              name="image"
              type="file"
              accept="image/*"
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2 text-[#3A3028] text-sm file:mr-3 file:border-0 file:bg-[#1C3144] file:text-[#FAFAF7] file:text-xs file:tracking-widest file:uppercase file:px-3 file:py-1 file:cursor-pointer"
            />
          </div>

          {state?.error && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-[#1C3144] text-[#FAFAF7] py-3 text-xs tracking-widest uppercase hover:bg-[#C4A882] transition-colors disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Save Post'}
          </button>
        </form>
      </div>
    </div>
  )
}
