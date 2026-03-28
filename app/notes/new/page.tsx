'use client'

import { useActionState, useRef } from 'react'
import Link from 'next/link'
import { createNote } from '@/app/actions'

export default function NewNotePage() {
  const [state, action, pending] = useActionState(createNote, undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs tracking-[6px] uppercase text-[#C4A882] mb-1">Makiharado</p>
            <h1 className="text-xl text-[#1C3144]">New Note</h1>
          </div>
          <Link
            href="/dashboard"
            className="text-xs tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
          >
            ← Back
          </Link>
        </div>

        <form action={action} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Title
            </label>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Spaced repetition basics"
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
              rows={6}
              placeholder="Write your note here..."
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882] placeholder:text-[#C4A882]/40 resize-none"
            />
          </div>

          {/* Image upload — required */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Image <span className="text-red-500">*</span>
              <span className="normal-case tracking-normal text-[#C4A882] ml-1">(photo of your handwritten note)</span>
            </label>
            <input
              ref={fileRef}
              name="image"
              type="file"
              accept="image/*"
              required
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2 text-[#3A3028] text-sm file:mr-3 file:border-0 file:bg-[#1C3144] file:text-[#FAFAF7] file:text-xs file:tracking-widest file:uppercase file:px-3 file:py-1 file:cursor-pointer"
            />
          </div>

          {state?.error && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}

          {/* Review schedule info */}
          <div className="border-t border-[#C4A882]/20 pt-4">
            <p className="text-xs text-[#8A7A6A] tracking-wide">
              Reviews will be scheduled at midnight on:{' '}
              <span className="text-[#C4A882]">Day 1 · Day 3 · Day 7 · Day 14 · Day 30</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-[#1C3144] text-[#FAFAF7] py-3 text-xs tracking-widest uppercase hover:bg-[#C4A882] transition-colors disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Save Note & Schedule Reviews'}
          </button>
        </form>
      </div>
    </div>
  )
}
