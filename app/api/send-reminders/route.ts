import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export const runtime = 'nodejs'

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function sendReminderEmail(
  to: string,
  items: { title: string; href: string }[],
  _appUrl: string
) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const linksHtml = items
    .map(
      n =>
        `<p><a href="${n.href}" style="color:#1C3144;">${escapeHtml(n.title)}</a></p>`
    )
    .join('')

  const linksText = items
    .map(n => `${n.title}\n${n.href}`)
    .join('\n\n')

  await resend.emails.send({
    from: 'Makiharado <reminders@makiharado.com>',
    to,
    subject: 'Review Reminder — Makiharado',
    text: `You have a note to review.\n\nClick below to see:\n\n${linksText}`,
    html: `
      <p>You have a note to review.</p>
      <p>Click below to see:</p>
      ${linksHtml}
    `,
  })
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Use APP_URL env var — never trust the Host header for security-sensitive output
  const appUrl = process.env.APP_URL ?? 'https://localhost:3000'

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // 1. Find users who have notifications enabled
  const { data: settings, error: settingsError } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('notification_enabled', true)

  if (settingsError) return Response.json({ error: settingsError.message }, { status: 500 })
  if (!settings?.length) return Response.json({ sent: 0 })

  const userIds = settings.map(s => s.user_id)

  // 2. Find uncompleted reviews due today — join both notes and posts titles
  const { data: dueReviews } = await supabase
    .from('reviews')
    .select('user_id, note_id, post_id, notes(title), posts(title)')
    .in('user_id', userIds)
    .eq('due_date', today)
    .is('completed_at', null)

  if (!dueReviews?.length) return Response.json({ sent: 0 })

  // 3. Group items by user
  type ReviewEntry = { title: string; href: string }
  const byUser = new Map<string, ReviewEntry[]>()
  for (const review of dueReviews) {
    const noteTitle = (review.notes as unknown as { title: string } | null)?.title
    const postTitle = (review.posts as unknown as { title: string } | null)?.title
    const title = noteTitle ?? postTitle ?? 'Untitled'
    // Note reviews deep-link to the review card; post reviews link to dashboard
    const href = review.note_id
      ? `${appUrl}/dashboard?note=${review.note_id}`
      : `${appUrl}/dashboard`
    const entry: ReviewEntry = { title, href }
    const existing = byUser.get(review.user_id)
    if (existing) existing.push(entry)
    else byUser.set(review.user_id, [entry])
  }

  // 4. Send one email per user listing all their due notes
  let sent = 0
  for (const [userId, notes] of byUser) {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    if (!user?.email) continue
    try {
      await sendReminderEmail(user.email, notes, appUrl)  // appUrl kept for signature compat
      sent++
    } catch {
      console.error(`Failed to send reminder to user ${userId}`)
    }
  }

  return Response.json({ sent })
}
