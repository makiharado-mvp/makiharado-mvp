'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPost, deletePost, toggleNotifications } from '@/app/actions'
import { compressImage } from '@/lib/compressImage'
import ReviewCard from '@/components/ReviewCard'
import { createClient } from '@/lib/supabase/client'
import type { Post, PostImage, Review } from '@/types'

function NotificationToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled)
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    const next = !on
    setOn(next)
    startTransition(async () => {
      await toggleNotifications(next)
    })
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#C4A882]/20">
      <div>
        <p className="text-[10px] tracking-widest uppercase text-[#8A7A6A]">Email Reminders</p>
        <p className="text-[10px] text-[#C4A882]/70 mt-0.5">Notify me on review days</p>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className={[
          'relative w-10 h-5 rounded-full transition-colors duration-200 disabled:opacity-40',
          on ? 'bg-[#1C3144]' : 'bg-[#C4A882]/30',
        ].join(' ')}
        aria-label={on ? 'Turn off email reminders' : 'Turn on email reminders'}
      >
        <span
          className={[
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200',
            on ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

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
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const result = await deletePost(post.id)
    if (result?.error) {
      setDeleteError(result.error)
      setDeleting(false)
      setConfirming(false)
    } else {
      onClose()
    }
  }

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
        {/* Images: use post_images (sorted by position), fall back to legacy image_url */}
        {(post.post_images && post.post_images.length > 0)
          ? [...post.post_images]
              .sort((a: PostImage, b: PostImage) => a.position - b.position)
              .map((img: PostImage) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.image_url} alt={post.title} className="w-full object-contain" />
              ))
          : post.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.image_url} alt={post.title} className="w-full object-contain" />
            )
        }
        {post.content && (
          <div className="p-5 border-t border-[#C4A882]/20">
            <p className="text-sm text-[#3A3028] leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>
        )}

        {/* Delete section */}
        <div className="px-5 py-4 border-t border-[#C4A882]/20 flex items-center justify-between gap-3">
          {deleteError && (
            <p className="text-xs text-red-600">{deleteError}</p>
          )}
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="ml-auto text-[10px] tracking-widest uppercase text-[#8A7A6A]/60 hover:text-red-500 transition-colors"
            >
              Delete post
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[10px] text-[#8A7A6A]">Are you sure?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="text-[10px] tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] tracking-widest uppercase text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Confirm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NoteDetailModal({ title, imageUrl, content, reviewDay, dueDate, onClose }: {
  title: string
  imageUrl: string | null
  content: string
  reviewDay: number
  dueDate: string
  onClose: () => void
}) {
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
              Review Day {reviewDay} — due {formatDate(dueDate, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h2 className="text-[#1C3144] text-lg">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A7A6A] hover:text-[#1C3144] text-lg leading-none ml-4 mt-1 transition-colors"
          >
            ✕
          </button>
        </div>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="w-full object-contain" />
        )}
        {content && (
          <div className="p-5 border-t border-[#C4A882]/20">
            <p className="text-sm text-[#3A3028] leading-relaxed whitespace-pre-wrap">{content}</p>
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
  notificationEnabled,
  initialNoteId,
  userId,
}: {
  reviews: Review[]
  posts: Post[]
  initialDate: string
  notificationEnabled: boolean
  initialNoteId?: string
  userId: string
}) {
  const [year, setYear]   = useState(() => parseInt(initialDate.slice(0, 4), 10))
  const [month, setMonth] = useState(() => parseInt(initialDate.slice(5, 7), 10) - 1)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [todayISO, setTodayISO]         = useState('')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [dateReviews, setDateReviews] = useState<Review[]>([])
  // maps review.id → next due_date string, or null if this is the final review
  const [nextDueDateMap, setNextDueDateMap] = useState<Record<string, string | null>>({})
  const [formState, setFormState] = useState<{ error?: string } | undefined>(undefined)
  const [formPending, startFormTransition] = useTransition()
  const [compressing, setCompressing] = useState(false)
  const [compressError, setCompressError] = useState<string | null>(null)
  const [imageCount, setImageCount] = useState(0)

  async function handlePostSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCompressError(null)
    setFormState(undefined)
    setCompressing(true)

    const rawData = new FormData(e.currentTarget)
    const rawFiles = rawData.getAll('image') as File[]
    const validFiles = rawFiles.filter(f => f.size > 0)

    let compressedFiles: File[]
    try {
      compressedFiles = []
      for (const f of validFiles) {
        compressedFiles.push(await compressImage(f))  // sequential — one at a time
      }
    } catch (err) {
      setCompressing(false)
      setCompressError(err instanceof Error ? err.message : 'Image compression failed.')
      return
    }

    // Rebuild FormData with compressed files in place of originals
    const newData = new FormData()
    for (const [key, value] of rawData.entries()) {
      if (key !== 'image') newData.append(key, value)
    }
    for (const f of compressedFiles) {
      newData.append('image', f)
    }

    setCompressing(false)
    startFormTransition(async () => {
      const result = await createPost(undefined, newData)
      if (result?.error) setFormState(result)
      // On success, createPost calls redirect() — navigation happens automatically
    })
  }

  useEffect(() => {
    const t = new Date()
    setTodayISO(toISO(t.getFullYear(), t.getMonth(), t.getDate()))
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: current } = await supabase
        .from('reviews')
        .select('*, notes(*), posts(*)')
        .eq('user_id', userId)
        .eq('due_date', selectedDate)

      const reviews = current ?? []
      setDateReviews(reviews)

      // Collect post_ids and note_ids to look up next scheduled review for each
      const postIds = reviews.map(r => r.post_id).filter(Boolean) as string[]
      const noteIds = reviews.map(r => r.note_id).filter(Boolean) as string[]

      if (postIds.length === 0 && noteIds.length === 0) {
        setNextDueDateMap({})
        return
      }

      const filters: string[] = []
      if (postIds.length > 0) filters.push(`post_id.in.(${postIds.join(',')})`)
      if (noteIds.length > 0) filters.push(`note_id.in.(${noteIds.join(',')})`)

      const { data: upcoming } = await supabase
        .from('reviews')
        .select('post_id, note_id, due_date')
        .eq('user_id', userId)
        .or(filters.join(','))
        .gt('due_date', selectedDate)
        .order('due_date', { ascending: true })

      const map: Record<string, string | null> = {}
      for (const r of reviews) {
        const next = (upcoming ?? []).find(u =>
          (r.post_id && u.post_id === r.post_id) ||
          (r.note_id && u.note_id === r.note_id)
        )
        map[r.id] = next?.due_date ?? null
      }
      setNextDueDateMap(map)
    }

    load()
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

  const datePosts = posts.filter(p => p.post_date === selectedDate)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* ── Top row: Calendar (left) | Reviews + Post Form (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

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

          {/* Selected date panels */}
          <div className="mt-5 space-y-5">
            <p className="text-[10px] tracking-widest uppercase text-[#8A7A6A]">
              {formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            {/* Posts for selected date */}
            <div>
              <p className="text-[10px] tracking-widest uppercase text-[#C4A882] mb-2">Posted</p>
              {datePosts.length === 0 ? (
                <p className="text-[10px] text-[#C4A882]/60 tracking-wide">No posts on this date.</p>
              ) : (
                <div className="space-y-1">
                  {datePosts.map(post => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="w-full text-left px-3 py-2.5 border border-[#C4A882]/30 bg-white hover:border-[#C4A882] transition-colors"
                    >
                      <p className="text-[#1C3144] text-sm truncate">{post.title}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews scheduled for selected date */}
            <div>
              <p className="text-[10px] tracking-widest uppercase text-[#C4A882] mb-2">Reviews scheduled</p>
              {dateReviews.length === 0 ? (
                <p className="text-[10px] text-[#C4A882]/60 tracking-wide">No reviews scheduled for this date.</p>
              ) : (
                <div className="space-y-1">
                  {dateReviews.map(review => {
                    const source = review.notes ?? review.posts
                    const nextDue = nextDueDateMap[review.id]
                    return (
                      <button
                        key={review.id}
                        type="button"
                        onClick={() => setSelectedReview(review)}
                        className="w-full text-left px-3 py-2.5 border border-[#C4A882]/30 bg-white hover:border-[#C4A882] transition-colors"
                      >
                        <p className="text-[#1C3144] text-sm truncate">{source?.title ?? '—'}</p>
                        <p className="text-[10px] text-[#8A7A6A] mt-0.5">
                          Day {review.interval_day}
                          {review.id in nextDueDateMap
                            ? nextDue
                              ? ` · Next: ${formatDate(nextDue, { day: 'numeric', month: 'short' })}`
                              : ' · Final review'
                            : ''}
                          {review.completed_at ? ' · done' : ''}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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
                  <ReviewCard key={review.id} review={review} initialOpen={review.note_id === initialNoteId} />
                ))}
              </div>
            ) : (
              <div className="border border-[#C4A882]/30 p-4 text-center">
                <p className="text-[#8A7A6A] text-sm">Nothing due today.</p>
              </div>
            )}
          </div>

          {/* Notification toggle */}
          <NotificationToggle enabled={notificationEnabled} />

          {/* New Post Form */}
          <div>
            <p className="text-[10px] tracking-[6px] uppercase text-[#C4A882] mb-3">New Post</p>
            <form onSubmit={handlePostSubmit} className="space-y-3">

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
                  Images <span className="text-red-400">*</span>
                  <span className="normal-case tracking-normal text-[#C4A882] ml-1">(1–5)</span>
                </label>
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  multiple
                  required
                  onChange={e => setImageCount(e.target.files?.length ?? 0)}
                  className="w-full border border-[#C4A882]/40 bg-white px-3 py-1.5 text-[#3A3028] text-sm file:mr-3 file:border-0 file:bg-[#1C3144] file:text-[#FAFAF7] file:text-xs file:tracking-widest file:uppercase file:px-3 file:py-1 file:cursor-pointer"
                />
                {imageCount > 5 && (
                  <p className="text-xs text-red-600 mt-1">Maximum 5 images. Please remove {imageCount - 5}.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-1">
                  Comment
                  <span className="normal-case tracking-normal text-[#C4A882] ml-1">(optional)</span>
                </label>
                <textarea
                  name="content"
                  rows={3}
                  placeholder="Write something..."
                  className="w-full border border-[#C4A882]/40 bg-white px-3 py-2 text-[#3A3028] text-sm focus:border-[#C4A882] placeholder:text-[#C4A882]/40 resize-none outline-none"
                />
              </div>

              {compressError && (
                <p className="text-xs text-red-600">{compressError}</p>
              )}
              {formState?.error && (
                <p className="text-xs text-red-600">{formState.error}</p>
              )}

              <p className="text-[10px] text-[#C4A882]/70 leading-relaxed">
                Uploaded content may be stored and visible as part of the service.
              </p>

              <button
                type="submit"
                disabled={compressing || formPending}
                className="w-full bg-[#1C3144] text-[#FAFAF7] py-2.5 text-xs tracking-widest uppercase hover:bg-[#C4A882] transition-colors disabled:opacity-50"
              >
                {compressing ? 'Compressing...' : formPending ? 'Saving...' : 'Save Post'}
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Post detail modal */}
      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {/* Review note/post detail modal */}
      {selectedReview && (selectedReview.notes ?? selectedReview.posts) && (() => {
        const source = selectedReview.notes ?? selectedReview.posts!
        return (
          <NoteDetailModal
            title={source.title}
            imageUrl={source.image_url}
            content={source.content}
            reviewDay={selectedReview.interval_day}
            dueDate={selectedReview.due_date}
            onClose={() => setSelectedReview(null)}
          />
        )
      })()}
    </div>
  )
}
