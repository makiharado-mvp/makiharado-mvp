'use client'

import { useState, useEffect, useActionState } from 'react'
import { createPost } from '@/app/actions'
import ReviewCard from '@/components/ReviewCard'
import type { Post, Review } from '@/types'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', opts)
}

function PostDetailModal({ post, onClose }: { post: Post; onClose: () => void }) {
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
        <div className="flex items-start justify-between p-5 border-b border-[#C4A882]/30">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-[#C4A882] mb-1">
              {formatDate(post.post_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h2 className="text-[#1C3144] text-lg">{post.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A7A6A] hover:text-[#1C3144] text-lg leading-none ml-4 mt-1 transition-colors"
          >
            ✕
          </button>
        </div>
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt={post.title} className="w-full object-contain" />
        )}
        {post.content && (
          <div className="p-5 border-t border-[#C4A882]/20">
            <p className="text-sm text-[#3A3028] leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardClient({
  reviews,
  posts,
  initialDate,
}: {
  reviews: Review[]
  posts: Post[]
  initialDate: string
}) {
  const [year, setYear]     = useState(() => parseInt(initialDate.slice(0, 4), 10))
  const [month, setMonth]   = useState(() => parseInt(initialDate.slice(5, 7), 10) - 1)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [todayISO, setTodayISO]         = useState('')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [formState, formAction, formPending] = useActionState(createPost, undefined)

  // Set today client-side only — avoids SSR/hydration mismatch
  useEffect(() => {
    const t = new Date()
    setTodayISO(toISO(t.getFullYear(), t.getMonth(), t.getDate()))
  }, [])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()
  const cells       = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )

  // Posts for the selected calendar date
  const datePosts = posts.filter(p => p.post_date === selectedDate)

  // All posts split for bottom section
  const latestPost = posts[0] ?? null
  const olderPosts = posts.slice(1)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* ── Top: Calendar (left) + Reviews + Post Form (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-14">

        {/* Left — Calendar + date post list */}
        <div>
          <p className="text-[10px] tracking-[6px] uppercase text-[#C4A882] mb-4">Calendar</p>
          <div className="border border-[#C4A882]/30 bg-white">

            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#C4A882]/20">
              <button type="button" onClick={prevMonth}
                className="text-[#8A7A6A] hover:text-[#1C3144] text-lg transition-colors px-2">‹</button>
              <span className="text-sm tracking-widest uppercase text-[#1C3144]">
                {MONTHS[month]} {year}
              </span>
              <button type="button" onClick={nextMonth}
                className="text-[#8A7A6A] hover:text-[#1C3144] text-lg transition-colors px-2">›</button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[#C4A882]/20">
              {DAYS.map(d => (
                <div key={d} className="text-center py-2 text-[10px] tracking-widest uppercase text-[#C4A882]">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} className="aspect-square" />
                const iso        = toISO(year, month, day)
                const isSelected = iso === selectedDate
                const isToday    = iso === todayISO
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(iso)}
                    className={[
                      'aspect-square flex items-center justify-center text-sm transition-colors',
                      isSelected
                        ? 'bg-[#1C3144] text-[#FAFAF7]'
                        : isToday
                          ? 'bg-[#C4A882]/20 text-[#1C3144] font-medium'
                          : 'text-[#3A3028] hover:bg-[#C4A882]/10',
                    ].join(' ')}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Posts for selected date */}
          <div className="mt-4">
            <p className="text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-2">
              {formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {datePosts.length === 0 ? (
              <p className="text-[10px] text-[#C4A882]/70 tracking-wide">No posts on this date.</p>
            ) : (
              <div className="space-y-1">
                {datePosts.map(post => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="w-full text-left px-3 py-2 border border-[#C4A882]/30 bg-white hover:border-[#C4A882] transition-colors"
                  >
                    <p className="text-[#1C3144] text-sm truncate">{post.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Reviews + Post Form */}
        <div className="space-y-8">

          {/* Today's Reviews */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] tracking-[6px] uppercase text-[#C4A882]">Today&apos;s Reviews</p>
              <span className="text-[10px] text-[#8A7A6A]">
                {reviews.length} item{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
            {reviews.length > 0 ? (
              <div className="space-y-2">
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="border border-[#C4A882]/30 p-4 text-center">
                <p className="text-[#8A7A6A] text-sm">Nothing due today.</p>
                <p className="text-[#C4A882] text-xs mt-1">良い調子です</p>
              </div>
            )}
          </div>

          {/* New Post Form */}
          <div>
            <p className="text-[10px] tracking-[6px] uppercase text-[#C4A882] mb-3">New Post</p>
            <form action={formAction} className="space-y-3">
              {/* Date driven by calendar selection */}
              <input type="hidden" name="post_date" value={selectedDate} />

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Morning reflection"
                  className="w-full border border-[#C4A882]/40 bg-white px-3 py-2 text-[#3A3028] text-sm focus:border-[#C4A882] placeholder:text-[#C4A882]/40 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-1">
                  Comment
                </label>
                <textarea
                  name="content"
                  rows={3}
                  placeholder="Write something..."
                  className="w-full border border-[#C4A882]/40 bg-white px-3 py-2 text-[#3A3028] text-sm focus:border-[#C4A882] placeholder:text-[#C4A882]/40 resize-none outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-1">
                  Image <span className="normal-case tracking-normal text-[#C4A882]">(optional)</span>
                </label>
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  className="w-full border border-[#C4A882]/40 bg-white px-3 py-1.5 text-[#3A3028] text-sm file:mr-3 file:border-0 file:bg-[#1C3144] file:text-[#FAFAF7] file:text-xs file:tracking-widest file:uppercase file:px-3 file:py-1 file:cursor-pointer"
                />
              </div>

              {formState?.error && (
                <p className="text-xs text-red-600">{formState.error}</p>
              )}

              <button
                type="submit"
                disabled={formPending}
                className="w-full bg-[#1C3144] text-[#FAFAF7] py-2.5 text-xs tracking-widest uppercase hover:bg-[#C4A882] transition-colors disabled:opacity-50"
              >
                {formPending ? 'Saving...' : 'Save Post'}
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* ── Bottom: Latest Posts ── */}
      <div>
        <p className="text-[10px] tracking-[6px] uppercase text-[#C4A882] mb-6">Latest Posts</p>

        {posts.length === 0 ? (
          <div className="border border-[#C4A882]/30 p-8 text-center">
            <p className="text-[#8A7A6A] text-sm">No posts yet. Select a date and save your first post.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Featured — latest post */}
            <div className="lg:col-span-2">
              {latestPost && (
                <div className="border border-[#C4A882]/30 bg-white">
                  <div className="p-5 border-b border-[#C4A882]/20">
                    <p className="text-[10px] tracking-widest uppercase text-[#C4A882] mb-1">
                      {formatDate(latestPost.post_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <h2 className="text-[#1C3144] text-xl">{latestPost.title}</h2>
                  </div>
                  {latestPost.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={latestPost.image_url}
                      alt={latestPost.title}
                      className="w-full object-contain"
                    />
                  )}
                  {latestPost.content && (
                    <div className="p-5 border-t border-[#C4A882]/20">
                      <p className="text-sm text-[#3A3028] leading-relaxed whitespace-pre-wrap">
                        {latestPost.content}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Earlier posts — vertical scrollable list */}
            {olderPosts.length > 0 && (
              <div className="lg:col-span-1">
                <p className="text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-3">Earlier</p>
                <div className="h-80 overflow-y-auto space-y-1 pr-1">
                  {olderPosts.map(post => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="w-full text-left border border-[#C4A882]/30 bg-white px-4 py-3 hover:border-[#C4A882] transition-colors"
                    >
                      <p className="text-[10px] tracking-widest uppercase text-[#C4A882] mb-0.5">
                        {formatDate(post.post_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[#1C3144] text-sm truncate">{post.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Post detail modal */}
      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  )
}
