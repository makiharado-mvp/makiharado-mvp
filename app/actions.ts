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

  // Validate image (H4: MIME check is server-side — accept="image/*" is UI-only)
  if (!imageFile || imageFile.size === 0) {
    return { error: 'Please attach an image of your handwritten note.' }
  }
  if (imageFile.size > 10 * 1024 * 1024) {
    return { error: 'Image must be under 10 MB.' }
  }
  if (!imageFile.type.startsWith('image/')) {
    return { error: 'File must be an image (JPEG, PNG, etc.).' }
  }

  // Sanitise the file extension — fall back to 'jpg' if the filename has no dot
  const rawExt = imageFile.name.split('.').pop() ?? ''
  const ext = /^[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt.toLowerCase() : 'jpg'

  // Step 1 — upload image.
  // Must happen before the DB insert so we have the URL.
  // If this fails, nothing else has been created — safe to return immediately.
  const storagePath = `${user.id}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('note-image')
    .upload(storagePath, imageFile)
  if (uploadError) {
    return { error: `Image upload failed: ${uploadError.message}` }
  }
  const { data: urlData } = supabase.storage.from('note-image').getPublicUrl(storagePath)
  const image_url = urlData.publicUrl

  // Step 2 — insert note row.
  // On failure, delete the already-uploaded storage file so it doesn't remain orphaned.
  const { data: note, error: noteError } = await supabase
    .from('notes')
    .insert({ user_id: user.id, title, content, image_url })
    .select()
    .single()
  if (noteError || !note) {
    await supabase.storage.from('note-image').remove([storagePath])
    return { error: noteError?.message ?? 'Failed to create note' }
  }

  // Step 3 — schedule reviews.
  // On failure, roll back both the note row and the storage file.
  const reviewRows = scheduleReviews(new Date(), note.id, user.id)
  const { error: reviewsError } = await supabase.from('reviews').insert(reviewRows)
  if (reviewsError) {
    console.error('[createNote] Review scheduling failed, rolling back:', reviewsError.message)
    await supabase.from('notes').delete().eq('id', note.id).eq('user_id', user.id)
    await supabase.storage.from('note-image').remove([storagePath])
    return { error: `Failed to schedule reviews: ${reviewsError.message}` }
  }

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

  // Validate image (H4: MIME check is server-side — accept="image/*" is UI-only)
  if (!title) return { error: 'Title is required.' }
  if (!imageFile || imageFile.size === 0) return { error: 'Image is required.' }
  if (imageFile.size > 10 * 1024 * 1024) return { error: 'Image must be under 10 MB.' }
  if (!imageFile.type.startsWith('image/')) {
    return { error: 'File must be an image (JPEG, PNG, etc.).' }
  }

  // Sanitise the file extension — fall back to 'jpg' if the filename has no dot
  const rawExt = imageFile.name.split('.').pop() ?? ''
  const ext = /^[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt.toLowerCase() : 'jpg'

  // Step 1 — upload image.
  const storagePath = `${user.id}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('note-image')
    .upload(storagePath, imageFile)
  if (uploadError) {
    return { error: `Image upload failed: ${uploadError.message}` }
  }
  const { data: urlData } = supabase.storage.from('note-image').getPublicUrl(storagePath)
  const image_url = urlData.publicUrl

  // Step 2 — insert post row.
  // On failure, delete the already-uploaded storage file so it doesn't remain orphaned.
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({ user_id: user.id, title, content, post_date, image_url })
    .select()
    .single()
  if (postError || !post) {
    await supabase.storage.from('note-image').remove([storagePath])
    return { error: postError?.message ?? 'Failed to create post' }
  }

  // Step 3 — schedule reviews.
  // On failure, roll back both the post row and the storage file.
  const reviewRows = schedulePostReviews(post_date, post.id, user.id)
  const { error: reviewsError } = await supabase
    .from('reviews')
    .upsert(reviewRows, { onConflict: 'post_id,interval_day', ignoreDuplicates: true })
  if (reviewsError) {
    console.error('[createPost] Review scheduling failed, rolling back:', reviewsError.message)
    await supabase.from('posts').delete().eq('id', post.id).eq('user_id', user.id)
    await supabase.storage.from('note-image').remove([storagePath])
    return { error: `Failed to schedule reviews: ${reviewsError.message}` }
  }

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
  // Fail immediately if any count > 0 OR if a count query itself fails.
  // A null/errored count is treated as unsafe (not as zero) so we never
  // silently proceed to deleteUser() with unknown remaining state.
  const verifyTables = ['reviews', 'posts', 'notes', 'user_settings'] as const
  const verifyCounts = await Promise.all(
    verifyTables.map(t =>
      admin.from(t).select('*', { count: 'exact', head: true }).eq('user_id', userId)
    )
  )
  for (let i = 0; i < verifyTables.length; i++) {
    const { count, error } = verifyCounts[i]
    const table = verifyTables[i]
    if (error) {
      console.error(`[deleteAccount] Verification query failed for ${table} (${userId}):`, error.message)
      return { error: `Account deletion blocked: could not verify ${table} — ${error.message}` }
    }
    if (typeof count !== 'number') {
      console.error(`[deleteAccount] Unexpected null count for ${table} (${userId})`)
      return { error: `Account deletion blocked: unexpected response verifying ${table}` }
    }
    if (count > 0) {
      console.error(`[deleteAccount] ${table} still has ${count} row(s) for ${userId}`)
      return { error: `Account deletion blocked: ${table} still has ${count} row(s)` }
    }
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

export async function completeReview(reviewId: string): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }
  const { error } = await supabase
    .from('reviews')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('user_id', user.id)
  if (error) {
    console.error('[completeReview] Failed:', error.message)
    return { error: 'Failed to mark review as done. Please try again.' }
  }
  revalidatePath('/dashboard')
}
