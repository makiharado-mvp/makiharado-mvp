import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/reviews'
import Nav from '@/components/Nav'
import ReviewCard from '@/components/ReviewCard'
import NoteCard from '@/components/NoteCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Reviews due today or earlier, not yet completed
  const { data: dueReviews } = await supabase
    .from('reviews')
    .select('*, notes(*)')
    .eq('user_id', user.id)
    .is('completed_at', null)
    .lte('due_date', todayISO())
    .order('due_date', { ascending: true })

  // All notes, newest first
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <Nav email={user.email ?? ''} />

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-12">

        {/* Due Reviews */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs tracking-widest uppercase text-[#C4A882]">
              Due Today
            </h2>
            <span className="text-xs text-[#8A7A6A]">
              {dueReviews?.length ?? 0} item{dueReviews?.length !== 1 ? 's' : ''}
            </span>
          </div>

          {dueReviews && dueReviews.length > 0 ? (
            <div className="space-y-2">
              {dueReviews.map(review => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="border border-[#C4A882]/30 p-6 text-center">
              <p className="text-[#8A7A6A] text-sm">Nothing due today.</p>
              <p className="text-[#C4A882] text-xs mt-1 tracking-wide">良い調子です</p>
            </div>
          )}
        </section>

        {/* Notes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs tracking-widest uppercase text-[#C4A882]">
              Your Notes
            </h2>
            <a
              href="/notes/new"
              className="text-xs tracking-widest uppercase text-[#1C3144] border-b border-[#1C3144] pb-0.5 hover:text-[#C4A882] hover:border-[#C4A882] transition-colors"
            >
              + Add note
            </a>
          </div>

          {notes && notes.length > 0 ? (
            <div className="space-y-2">
              {notes.map(note => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <div className="border border-[#C4A882]/30 p-6 text-center">
              <p className="text-[#8A7A6A] text-sm">No notes yet.</p>
              <a
                href="/notes/new"
                className="inline-block mt-3 text-xs tracking-widest uppercase text-[#1C3144] underline underline-offset-2"
              >
                Create your first note
              </a>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
