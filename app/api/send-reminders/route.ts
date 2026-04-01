import { createAdminClient } from '@/lib/supabase/admin'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

async function sendReminderEmail(to: string) {
  const transporter = createTransport()
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject: 'Review Reminder',
    text: 'You have a note to review today.',
  })
}

export async function GET(request: Request) {
  // Verify secret — set CRON_SECRET in Vercel env vars and pass it from your cron service
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

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

  // 2. Filter to those who have uncompleted reviews due today
  const { data: dueReviews } = await supabase
    .from('reviews')
    .select('user_id')
    .in('user_id', userIds)
    .eq('due_date', today)
    .is('completed_at', null)

  const usersWithDueReviews = [...new Set(dueReviews?.map(r => r.user_id) ?? [])]
  if (!usersWithDueReviews.length) return Response.json({ sent: 0 })

  // 3. Get each user's email and send reminder
  let sent = 0
  for (const userId of usersWithDueReviews) {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    if (!user?.email) continue
    try {
      await sendReminderEmail(user.email)
      sent++
    } catch {
      // Log and continue — don't fail the whole run if one email fails
      console.error(`Failed to send reminder to user ${userId}`)
    }
  }

  return Response.json({ sent })
}
