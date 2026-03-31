'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PostModal from '@/components/PostModal'
import type { Post } from '@/types'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarView({
  userId,
  initialDate,
}: {
  userId: string
  initialDate: string   // YYYY-MM-DD, resolved server-side — no SSR/client mismatch
}) {
  const [year, setYear]     = useState(() => parseInt(initialDate.slice(0, 4), 10))
  const [month, setMonth]   = useState(() => parseInt(initialDate.slice(5, 7), 10) - 1)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [todayISO, setTodayISO]         = useState('')   // set client-only to avoid mismatch
  const [posts, setPosts]               = useState<Post[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  // Set "today" only on the client to avoid SSR/hydration mismatch
  useEffect(() => {
    const t = new Date()
    setTodayISO(toISO(t.getFullYear(), t.getMonth(), t.getDate()))
  }, [])

  // Fetch posts whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data, error: qErr } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .eq('post_date', selectedDate)
          .order('created_at', { ascending: false })
        if (cancelled) return
        if (qErr) throw qErr
        setPosts(data ?? [])
      } catch {
        if (cancelled) return
        setError('Could not load posts.')
        setPosts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [selectedDate, userId])

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

  return (
    <>
      {/* ── Calendar ── */}
      <div className="border border-[#C4A882]/30 bg-white mb-8">

        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#C4A882]/20">
          <button
            onClick={prevMonth}
            className="text-[#8A7A6A] hover:text-[#1C3144] text-lg transition-colors px-2"
          >
            ‹
          </button>
          <span className="text-sm tracking-widest uppercase text-[#1C3144]">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="text-[#8A7A6A] hover:text-[#1C3144] text-lg transition-colors px-2"
          >
            ›
          </button>
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
            if (!day) return <div key={`empty-${i}`} className="aspect-square" />
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

      {/* ── Post list ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs tracking-widest uppercase text-[#C4A882]">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </h2>
          <a
            href={`/posts/new?date=${selectedDate}`}
            className="text-xs tracking-widest uppercase text-[#1C3144] border-b border-[#1C3144] pb-0.5 hover:text-[#C4A882] hover:border-[#C4A882] transition-colors"
          >
            + Add post
          </a>
        </div>

        {error && (
          <p className="text-xs text-red-600 py-2">{error}</p>
        )}

        {loading ? (
          <p className="text-xs text-[#8A7A6A] tracking-wide py-6 text-center">Loading...</p>
        ) : posts.length === 0 ? (
          <div className="border border-[#C4A882]/30 p-6 text-center">
            <p className="text-[#8A7A6A] text-sm">No posts for this date.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelectedPost(post)}
                className="w-full text-left border border-[#C4A882]/30 bg-white p-4 hover:border-[#C4A882] transition-colors flex items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[#1C3144] font-medium truncate">{post.title}</p>
                  {post.content && (
                    <p className="text-sm text-[#8A7A6A] mt-1 line-clamp-2">{post.content}</p>
                  )}
                </div>
                {post.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.image_url}
                    alt=""
                    className="shrink-0 w-14 h-14 object-cover border border-[#C4A882]/20"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </>
  )
}
