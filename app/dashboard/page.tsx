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

  // Reviews due today or earlier, not yet completed.
  // post_images is fetched in a separate query below — nested PostgREST joins
  // for newly-created tables can silently return null if the schema cache hasn't
  // refreshed yet, which was causing images to disappear from review cards.
  const { data: rawReviews } = await supabase
    .from('reviews')
    .select('*, notes(*), posts(*)')
    .eq('user_id', user.id)
    .is('completed_at', null)
    .lte('due_date', todayISO())
    .order('due_date', { ascending: true })

  // Collect all post_ids from today's reviews, then fetch post_images directly.
  const reviewPostIds = (rawReviews ?? [])
    .map(r => r.post_id)
    .filter((id): id is string => id !== null)

  const reviewPostImagesMap: Record<string, { id: string; image_url: string; position: number }[]> = {}
  if (reviewPostIds.length > 0) {
    const { data: postImgs } = await supabase
      .from('post_images')
      .select('id, post_id, image_url, position')
      .in('post_id', reviewPostIds)
    for (const img of postImgs ?? []) {
      if (!reviewPostImagesMap[img.post_id]) reviewPostImagesMap[img.post_id] = []
      reviewPostImagesMap[img.post_id].push(img)
    }
  }

  // Merge post_images into each review's posts object.
  const reviews = (rawReviews ?? []).map(r => ({
    ...r,
    posts: r.posts
      ? { ...r.posts, post_images: reviewPostImagesMap[r.posts.id] ?? [] }
      : null,
  }))

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
        reviews={reviews}
        posts={posts ?? []}
        initialDate={initialDate}
        notificationEnabled={settings?.notification_enabled ?? false}
        initialNoteId={initialNoteId}
        userId={user.id}
      />
    </div>
  )
}
