'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
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

  // Image is required
  if (!imageFile || imageFile.size === 0) {
    return { error: 'Please attach an image of your handwritten note.' }
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
  const post_date = formData.get('post_date') as string
  const imageFile = formData.get('image') as File | null

  if (!title) return { error: 'Title is required.' }
  if (!post_date) return { error: 'Date is required.' }
  if (!imageFile || imageFile.size === 0) return { error: 'Image is required.' }

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
