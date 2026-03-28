'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { scheduleReviews } from '@/lib/reviews'

// ── Auth ──────────────────────────────────────────────────────

export async function signIn(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
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
      .from('note-images')
      .upload(path, imageFile)

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('note-images')
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

// ── Reviews ───────────────────────────────────────────────────

export async function completeReview(reviewId: string) {
  const supabase = await createClient()
  await supabase
    .from('reviews')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', reviewId)
  revalidatePath('/dashboard')
}
