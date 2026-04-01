export const INTERVALS = [1, 3, 7, 14, 30]

/**
 * Schedule review dates based on calendar date, not time interval.
 * Reviews appear at midnight (00:00) on the scheduled day.
 *
 * Example: note created March 22 at 14:35
 *   → Day 1 review: March 23, 00:00
 *   → Day 3 review: March 25, 00:00
 *   → Day 7 review: March 29, 00:00
 */
export function scheduleReviews(
  createdAt: Date,
  noteId: string,
  userId: string
) {
  // Strip time → midnight of creation day
  const base = new Date(createdAt)
  base.setHours(0, 0, 0, 0)

  return INTERVALS.map(day => {
    const due = new Date(base)
    due.setDate(due.getDate() + day)
    return {
      note_id: noteId,
      user_id: userId,
      interval_day: day,
      due_date: due.toISOString().split('T')[0], // YYYY-MM-DD
    }
  })
}

/** Today's date as YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Schedule review dates for a post.
 * Uses post_date (YYYY-MM-DD) as the base day.
 * Reviews are linked via post_id (not note_id).
 */
export function schedulePostReviews(
  postDate: string, // YYYY-MM-DD
  postId: string,
  userId: string
) {
  const base = new Date(postDate + 'T00:00:00')
  base.setHours(0, 0, 0, 0)

  return INTERVALS.map(day => {
    const due = new Date(base)
    due.setDate(due.getDate() + day)
    return {
      post_id: postId,
      user_id: userId,
      interval_day: day,
      due_date: due.toISOString().split('T')[0], // YYYY-MM-DD
    }
  })
}

/** Human-readable interval label */
export function intervalLabel(day: number): string {
  const map: Record<number, string> = {
    1: 'Day 1',
    3: 'Day 3',
    7: 'Day 7',
    14: 'Day 14',
    30: 'Day 30',
  }
  return map[day] ?? `Day ${day}`
}
