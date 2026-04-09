import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LibraryNewClient from './LibraryNewClient'

export default async function LibraryNewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/library/new')

  const { from: sourceNoteId } = await searchParams

  let sourceNote: { id: string; title: string; content: string } | null = null
  if (sourceNoteId) {
    // Fetch the note server-side, protected by auth + explicit owner check.
    // Only title and content are passed to the client — no other private fields.
    // The note itself is never publicly exposed; it only pre-fills the form.
    const { data } = await supabase
      .from('notes')
      .select('id, title, content')
      .eq('id', sourceNoteId)
      .eq('user_id', user.id)  // explicit ownership — RLS alone is not enough for clarity
      .single()
    sourceNote = data ?? null
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <LibraryNewClient sourceNote={sourceNote} />
    </div>
  )
}
