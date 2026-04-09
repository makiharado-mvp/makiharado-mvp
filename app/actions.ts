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

// Allowed image file extensions (used as fallback when browser MIME type is unreliable,
// e.g. HEIC/HEIF on Chrome/Windows often reports as empty or application/octet-stream).
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'avif', 'bmp', 'tiff', 'tif',
])

// Explicit MIME map so we can set contentType on Supabase upload even when the browser
// reports an incorrect or empty type.
const EXT_TO_MIME: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif:  'image/gif',
  avif: 'image/avif',
  bmp:  'image/bmp',
  tiff: 'image/tiff',
  tif:  'image/tiff',
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

/** Returns an error string if the file is not an acceptable image, otherwise null. */
function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" is too large (max 5 MB per image).`
  }
  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? ''
  const extOk  = ALLOWED_IMAGE_EXTENSIONS.has(rawExt)
  const mimeOk = file.type.startsWith('image/')
  // Accept if EITHER the MIME type or the file extension is a known image format.
  // This handles HEIC files on browsers that misreport the MIME type.
  if (!extOk && !mimeOk) {
    return `"${file.name}" is not a recognised image format (JPEG, PNG, WEBP, HEIC, etc.).`
  }
  return null
}

export async function createPost(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string).trim()
  const content = (formData.get('content') as string).trim()
  const post_date = new Date().toISOString().split('T')[0] // always today on the server

  if (!title) return { error: 'Title is required.' }

  // --- Daily limit: max 3 posts per day, enforced server-side ---
  const { count: todayCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('post_date', post_date)
  if ((todayCount ?? 0) >= 3) {
    return { error: 'You can only create 3 posts per day.' }
  }

  // --- Image validation: extension + MIME (server-side, accept="image/*" is UI-only) ---
  const imageFiles = (formData.getAll('image') as File[]).filter(f => f.size > 0)
  if (imageFiles.length === 0) return { error: 'At least 1 image is required.' }
  if (imageFiles.length > 5) return { error: 'You can attach at most 5 images per post.' }
  for (const f of imageFiles) {
    const validationError = validateImageFile(f)
    if (validationError) return { error: validationError }
  }

  // --- Step 1: Upload all images sequentially ---
  // Keep track of uploaded paths for rollback on any failure.
  const timestamp = Date.now()
  const uploadedPaths: string[] = []
  const imageRows: { storage_path: string; image_url: string; position: number }[] = []

  for (let i = 0; i < imageFiles.length; i++) {
    const imageFile = imageFiles[i]
    const rawExt = imageFile.name.split('.').pop()?.toLowerCase() ?? ''
    const ext = /^[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt : 'jpg'
    const storagePath = `${user.id}/${timestamp}-${i}.${ext}`
    // Use the known MIME for the extension when the browser reports an incorrect type
    // (e.g. HEIC on Chrome/Windows). Falls back to the browser-reported type, then octet-stream.
    const contentType = imageFile.type.startsWith('image/')
      ? imageFile.type
      : (EXT_TO_MIME[ext] ?? 'application/octet-stream')

    const { error: uploadError } = await supabase.storage
      .from('note-image')
      .upload(storagePath, imageFile, { contentType })
    if (uploadError) {
      console.error(`[createPost] Upload failed for image ${i} ("${imageFile.name}"):`, uploadError.message)
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('note-image').remove(uploadedPaths)
      }
      return { error: `Failed to upload "${imageFile.name}": ${uploadError.message}` }
    }

    uploadedPaths.push(storagePath)
    const { data: urlData } = supabase.storage.from('note-image').getPublicUrl(storagePath)
    imageRows.push({ storage_path: storagePath, image_url: urlData.publicUrl, position: i })
  }

  // --- Step 2: Insert post row (no image_url — images live in post_images) ---
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({ user_id: user.id, title, content, post_date })
    .select()
    .single()
  if (postError || !post) {
    await supabase.storage.from('note-image').remove(uploadedPaths)
    return { error: postError?.message ?? 'Failed to create post' }
  }

  // --- Step 3: Insert post_images rows ---
  const { error: imagesError } = await supabase
    .from('post_images')
    .insert(imageRows.map(row => ({ ...row, post_id: post.id, user_id: user.id })))
  if (imagesError) {
    await supabase.from('posts').delete().eq('id', post.id).eq('user_id', user.id)
    await supabase.storage.from('note-image').remove(uploadedPaths)
    return { error: `Failed to save images: ${imagesError.message}` }
  }

  // --- Step 4: Schedule reviews ---
  // On failure, roll back the post row (post_images cascade) and storage files.
  const reviewRows = schedulePostReviews(post_date, post.id, user.id)
  const { error: reviewsError } = await supabase
    .from('reviews')
    .upsert(reviewRows, { onConflict: 'post_id,interval_day', ignoreDuplicates: true })
  if (reviewsError) {
    console.error('[createPost] Review scheduling failed, rolling back:', reviewsError.message)
    await supabase.from('posts').delete().eq('id', post.id).eq('user_id', user.id)
    await supabase.storage.from('note-image').remove(uploadedPaths)
    return { error: `Failed to schedule reviews: ${reviewsError.message}` }
  }

  revalidatePath('/dashboard')
  redirect(`/dashboard?date=${post_date}`)
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the post + its images — RLS ensures only the owner can read it
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, user_id, image_url, post_images(storage_path)')
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

  // Delete storage files — use stored storage_path from post_images (no URL parsing)
  const postImages = (post as typeof post & { post_images?: { storage_path: string }[] }).post_images ?? []
  if (postImages.length > 0) {
    const paths = postImages.map(img => img.storage_path)
    const { error: storageError } = await supabase.storage.from('note-image').remove(paths)
    if (storageError) console.error('Storage delete failed:', paths, storageError.message)
  } else if (post.image_url) {
    // Legacy fallback for posts created before the post_images table
    const marker = '/object/public/note-image/'
    const idx = post.image_url.indexOf(marker)
    if (idx !== -1) {
      const storagePath = post.image_url.slice(idx + marker.length)
      const { error: storageError } = await supabase.storage.from('note-image').remove([storagePath])
      if (storageError) console.error('Storage delete failed:', storagePath, storageError.message)
    }
  }

  // Delete the post row — cascades to post_images via FK ON DELETE CASCADE
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/dashboard')
}

// ── Library ───────────────────────────────────────────────────

export async function createLibraryPost(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title          = (formData.get('title') as string).trim()
  const content        = (formData.get('content') as string).trim()
  const top_category   = formData.get('top_category') as string
  const mid_category   = formData.get('mid_category') as string
  const item_type      = (formData.get('item_type') as string | null) || null
  const tagsRaw        = ((formData.get('tags') as string) ?? '').trim()
  const source_note_id = (formData.get('source_note_id') as string | null) || null

  if (!title)   return { error: 'Title is required.' }
  if (!content) return { error: 'Content is required.' }

  const VALID_TOP = ['language', 'other']
  const VALID_MID = ['japanese', 'english', 'chinese', 'math', 'science', 'other']
  const VALID_ITEM_TYPES = ['vocab', 'grammar', 'writing', 'quote', 'other']
  if (!VALID_TOP.includes(top_category)) return { error: 'Invalid category.' }
  if (!VALID_MID.includes(mid_category)) return { error: 'Invalid subcategory.' }
  if (item_type && top_category !== 'language') return { error: 'Item type only applies to language posts.' }
  if (item_type && !VALID_ITEM_TYPES.includes(item_type)) return { error: 'Invalid item type.' }

  const tags = tagsRaw
    .split(',')
    .map(t => t.trim().toLowerCase().slice(0, 30))
    .filter(t => t.length > 0)
    .slice(0, 10)

  // Daily limit: 5 library posts per day
  const today = new Date().toISOString().split('T')[0]
  const { count: todayCount } = await supabase
    .from('library_posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', `${today}T00:00:00.000Z`)
  if ((todayCount ?? 0) >= 5) {
    return { error: 'You can only publish 5 library posts per day.' }
  }

  // Image validation (0–2 images)
  const imageFiles = (formData.getAll('image') as File[]).filter(f => f.size > 0)
  if (imageFiles.length > 2) return { error: 'Maximum 2 images per library post.' }
  for (const f of imageFiles) {
    const err = validateImageFile(f)
    if (err) return { error: err }
  }

  // Upload images to library/{user_id}/ prefix to separate from private images
  const timestamp = Date.now()
  const uploadedPaths: string[] = []
  const imageRows: { storage_path: string; image_url: string; position: number }[] = []

  for (let i = 0; i < imageFiles.length; i++) {
    const imageFile = imageFiles[i]
    const rawExt = imageFile.name.split('.').pop()?.toLowerCase() ?? ''
    const ext = /^[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt : 'jpg'
    const storagePath = `${user.id}/library/${timestamp}-${i}.${ext}`
    const contentType = imageFile.type.startsWith('image/')
      ? imageFile.type
      : (EXT_TO_MIME[ext] ?? 'application/octet-stream')

    const { error: uploadError } = await supabase.storage
      .from('note-image')
      .upload(storagePath, imageFile, { contentType })
    if (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('note-image').remove(uploadedPaths)
      }
      return { error: `Failed to upload "${imageFile.name}": ${uploadError.message}` }
    }
    uploadedPaths.push(storagePath)
    const { data: urlData } = supabase.storage.from('note-image').getPublicUrl(storagePath)
    imageRows.push({ storage_path: storagePath, image_url: urlData.publicUrl, position: i })
  }

  // Insert library_post row
  const { data: post, error: postError } = await supabase
    .from('library_posts')
    .insert({ user_id: user.id, title, content, top_category, mid_category, item_type, tags, source_note_id })
    .select()
    .single()
  if (postError || !post) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from('note-image').remove(uploadedPaths)
    }
    return { error: postError?.message ?? 'Failed to create library post.' }
  }

  // Insert library_images rows
  if (imageRows.length > 0) {
    const { error: imagesError } = await supabase
      .from('library_images')
      .insert(imageRows.map(row => ({ ...row, library_post_id: post.id, user_id: user.id })))
    if (imagesError) {
      await supabase.from('library_posts').delete().eq('id', post.id).eq('user_id', user.id)
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('note-image').remove(uploadedPaths)
      }
      return { error: `Failed to save images: ${imagesError.message}` }
    }
  }

  revalidatePath('/library')
  redirect(`/library/${post.id}`)
}

export async function deleteLibraryPost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch post + images — RLS ensures only the owner can read this
  const { data: post, error: fetchError } = await supabase
    .from('library_posts')
    .select('id, user_id, library_images(storage_path)')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !post) return { error: 'Library post not found or access denied.' }

  const images = (post as typeof post & { library_images?: { storage_path: string }[] }).library_images ?? []
  if (images.length > 0) {
    const paths = images.map(img => img.storage_path)
    const { error: storageError } = await supabase.storage.from('note-image').remove(paths)
    if (storageError) console.error('[deleteLibraryPost] Storage remove failed:', storageError.message)
  }

  // Delete post row — cascades to library_images via ON DELETE CASCADE
  const { error: deleteError } = await supabase
    .from('library_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/library')
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

  // Step 2b — library posts (library_images cascade automatically)
  const { error: libraryError } = await admin
    .from('library_posts')
    .delete()
    .eq('user_id', userId)
  if (libraryError) {
    console.error(`[deleteAccount] Library posts delete failed for ${userId}:`, libraryError.message)
    return { error: `Failed to delete library posts: ${libraryError.message}` }
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
  // Private note/post images live at {userId}/, library images at {userId}/library/
  const [{ data: privateFiles, error: listError }, { data: libraryFiles, error: libListError }] =
    await Promise.all([
      admin.storage.from('note-image').list(userId),
      admin.storage.from('note-image').list(`${userId}/library`),
    ])
  if (listError) {
    console.error(`[deleteAccount] Storage list failed for ${userId}:`, listError.message)
    return { error: `Failed to list storage files: ${listError.message}` }
  }
  if (libListError) {
    console.error(`[deleteAccount] Library storage list failed for ${userId}:`, libListError.message)
    return { error: `Failed to list library storage files: ${libListError.message}` }
  }
  const allPaths = [
    ...(privateFiles ?? []).map(f => `${userId}/${f.name}`),
    ...(libraryFiles ?? []).map(f => `${userId}/library/${f.name}`),
  ]
  if (allPaths.length > 0) {
    const { error: removeError } = await admin.storage.from('note-image').remove(allPaths)
    if (removeError) {
      console.error(`[deleteAccount] Storage remove failed for ${userId}:`, removeError.message)
      return { error: `Failed to delete storage files: ${removeError.message}` }
    }
  }

  // Step 6 — verify no app rows remain before touching auth.users.
  // Fail immediately if any count > 0 OR if a count query itself fails.
  // A null/errored count is treated as unsafe (not as zero) so we never
  // silently proceed to deleteUser() with unknown remaining state.
  const verifyTables = ['reviews', 'posts', 'library_posts', 'notes', 'user_settings'] as const
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
