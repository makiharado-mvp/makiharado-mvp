import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/reviews'
import Nav from '@/components/Nav'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; note?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { date, note: initialNoteId } = await searchParams
  const initialDate = date ?? todayISO()

  // Reviews due today or earlier, not yet completed
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, notes(*), posts(*)')
    .eq('user_id', user.id)
    .is('completed_at', null)
    .lte('due_date', todayISO())
    .order('due_date', { ascending: true })

  // All posts with their images, newest first
  const { data: posts } = await supabase
    .from('posts')
    .select('*, post_images(id, storage_path, image_url, position)')
    .eq('user_id', user.id)
    .order('post_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30)

  // Notification preference (row may not exist yet — default false)
  const { data: settings } = await supabase
    .from('user_settings')
    .select('notification_enabled')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <Nav email={user.email ?? ''} />
      <DashboardClient
        reviews={reviews ?? []}
        posts={posts ?? []}
        initialDate={initialDate}
        notificationEnabled={settings?.notification_enabled ?? false}
        initialNoteId={initialNoteId}
        userId={user.id}
      />
    </div>
  )
}
