'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scheduleReviews, schedulePostReviews } from '@/lib/reviews'

// ── Auth ──────────────────────────────────────────────────────

export async function signIn(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  // Honour same-origin next param (e.g. from email reminder link)
  const next = formData.get('next') as string | null
  const destination = next?.startsWith('/') ? next : '/dashboard'
  redirect(destination)
}

export async function signUp(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  // If email confirmation is enabled in Supabase, session will be null
  // until the user clicks the confirmation link.
  if (!data.session) {
    return { success: 'Account created. Please check your email and confirm your address before signing in.' }
  }
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ── Notes ─────────────────────────────────────────────────────

export async function createNote(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string).trim()
  const content = (formData.get('content') as string).trim()
  const imageFile = formData.get('image') as File | null

  // Image is required and must be under 10 MB
  if (!imageFile || imageFile.size === 0) {
    return { error: 'Please attach an image of your handwritten note.' }
  }
  if (imageFile.size > 10 * 1024 * 1024) {
    return { error: 'Image must be under 10 MB.' }
  }

  let image_url: string | null = null

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('note-image')
      .upload(path, imageFile)

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('note-image')
        .getPublicUrl(path)
      image_url = urlData.publicUrl
    }
  }

  const { data: note, error } = await supabase
    .from('notes')
    .insert({ user_id: user.id, title, content, image_url })
    .select()
    .single()

  if (error || !note) return { error: error?.message ?? 'Failed to create note' }

  // Schedule all 5 review dates at midnight
  const reviewRows = scheduleReviews(new Date(), note.id, user.id)
  await supabase.from('reviews').insert(reviewRows)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

// ── Posts ─────────────────────────────────────────────────────

export async function createPost(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string).trim()
  const content = (formData.get('content') as string).trim()
  const post_date = new Date().toISOString().split('T')[0] // always today on the server
  const imageFile = formData.get('image') as File | null

  if (!title) return { error: 'Title is required.' }
  if (!imageFile || imageFile.size === 0) return { error: 'Image is required.' }
  if (imageFile.size > 10 * 1024 * 1024) return { error: 'Image must be under 10 MB.' }

  let image_url: string | null = null

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('note-image')
      .upload(path, imageFile)

    if (uploadError) {
      return { error: `Image upload failed: ${uploadError.message}` }
    }

    const { data: urlData } = supabase.storage
      .from('note-image')
      .getPublicUrl(path)
    image_url = urlData.publicUrl
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ user_id: user.id, title, content, post_date, image_url })
    .select()
    .single()

  if (error || !post) return { error: error?.message ?? 'Failed to create post' }

  // Schedule review records for this post (ignore duplicates)
  const reviewRows = schedulePostReviews(post_date, post.id, user.id)
  await supabase
    .from('reviews')
    .upsert(reviewRows, { onConflict: 'post_id,interval_day', ignoreDuplicates: true })

  revalidatePath('/dashboard')
  redirect(`/dashboard?date=${post_date}`)
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the post — RLS ensures only the owner can read it
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, user_id, image_url')
    .eq('id', postId)
    .eq('user_id', user.id)   // ownership check
    .single()

  if (fetchError || !post) return { error: 'Post not found or access denied.' }

  // Delete related review records (reviews.post_id has no cascade in the DB)
  await supabase
    .from('reviews')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id)

  // Delete the storage image if one exists
  if (post.image_url) {
    // URL format: .../object/public/note-image/{user_id}/{filename}
    const marker = '/object/public/note-image/'
    const idx = post.image_url.indexOf(marker)
    if (idx !== -1) {
      const storagePath = post.image_url.slice(idx + marker.length)
      const { error: storageError } = await supabase.storage.from('note-image').remove([storagePath])
      if (storageError) console.error('Storage delete failed:', storagePath, storageError.message)
    }
  }

  // Delete the post row (RLS enforces ownership at DB level too)
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/dashboard')
}

// ── Account deletion ──────────────────────────────────────────

export async function deleteAccount(): Promise<{ error: string } | undefined> {
  // Require the service role key upfront — it is needed for both data
  // deletion (bypassing RLS) and auth.admin.deleteUser().
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[deleteAccount] SUPABASE_SERVICE_ROLE_KEY is not set')
    return { error: 'Server configuration error: account deletion is unavailable. Please contact support.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userId = user.id

  // Use the admin client (service_role key) for ALL data deletions.
  // The user-session client goes through RLS and can silently delete 0 rows
  // if the session context is off — leaving FK-blocking rows behind and
  // causing auth.admin.deleteUser() to fail with a database error.
  // The admin client bypasses RLS entirely and surfaces real Postgres errors.
  const admin = createAdminClient()

  // Step 1 — reviews (must go first: references notes and posts via FK)
  const { error: reviewsError } = await admin
    .from('reviews')
    .delete()
    .eq('user_id', userId)
  if (reviewsError) {
    console.error(`[deleteAccount] Reviews delete failed for ${userId}:`, reviewsError.message)
    return { error: `Failed to delete reviews: ${reviewsError.message}` }
  }

  // Step 2 — posts
  const { error: postsError } = await admin
    .from('posts')
    .delete()
    .eq('user_id', userId)
  if (postsError) {
    console.error(`[deleteAccount] Posts delete failed for ${userId}:`, postsError.message)
    return { error: `Failed to delete posts: ${postsError.message}` }
  }

  // Step 3 — notes
  const { error: notesError } = await admin
    .from('notes')
    .delete()
    .eq('user_id', userId)
  if (notesError) {
    console.error(`[deleteAccount] Notes delete failed for ${userId}:`, notesError.message)
    return { error: `Failed to delete notes: ${notesError.message}` }
  }

  // Step 4 — user settings
  const { error: settingsError } = await admin
    .from('user_settings')
    .delete()
    .eq('user_id', userId)
  if (settingsError) {
    console.error(`[deleteAccount] User settings delete failed for ${userId}:`, settingsError.message)
    return { error: `Failed to delete user settings: ${settingsError.message}` }
  }

  // Step 5 — storage files (best-effort; non-fatal if folder is empty or missing)
  const { data: files, error: listError } = await admin.storage
    .from('note-image')
    .list(userId)
  if (listError) {
    console.error(`[deleteAccount] Storage list failed for ${userId}:`, listError.message)
    return { error: `Failed to list storage files: ${listError.message}` }
  }
  if (files && files.length > 0) {
    const paths = files.map(f => `${userId}/${f.name}`)
    const { error: removeError } = await admin.storage
      .from('note-image')
      .remove(paths)
    if (removeError) {
      console.error(`[deleteAccount] Storage remove failed for ${userId}:`, removeError.message)
      return { error: `Failed to delete storage files: ${removeError.message}` }
    }
  }

  // Step 6 — verify no app rows remain before touching auth.users.
  // If any count is > 0, stop immediately with a clear error rather than
  // letting deleteUser() fail with an opaque database FK error.
  const [rCount, pCount, nCount, sCount] = await Promise.all([
    admin.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('user_settings').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  const remaining = [
    rCount.count ? `reviews(${rCount.count})` : null,
    pCount.count ? `posts(${pCount.count})` : null,
    nCount.count ? `notes(${nCount.count})` : null,
    sCount.count ? `user_settings(${sCount.count})` : null,
  ].filter(Boolean)
  if (remaining.length > 0) {
    console.error(`[deleteAccount] Rows still remain for ${userId}: ${remaining.join(', ')}`)
    return { error: `Account deletion incomplete — rows still remain: ${remaining.join(', ')}. Please try again or contact support.` }
  }

  // Step 7 — hard-delete the auth user (frees the email for re-registration)
  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) {
    console.error(`[deleteAccount] Auth user delete failed for ${userId}:`, authError.message)
    return { error: `Failed to delete account: ${authError.message}` }
  }

  // Step 8 — clear the session now that the auth user is gone
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      cookieStore.set(cookie.name, '', { maxAge: 0, path: '/' })
    }
  }

  redirect('/login?message=account-deleted')
}

// ── Notifications ─────────────────────────────────────────────

export async function toggleNotifications(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, notification_enabled: enabled })
  revalidatePath('/dashboard')
}

// ── Reviews ───────────────────────────────────────────────────

export async function completeReview(reviewId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('reviews')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('user_id', user.id)
  revalidatePath('/dashboard')
}
