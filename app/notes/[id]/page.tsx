import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { intervalLabel } from '@/lib/reviews'

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: note } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!note) notFound()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('note_id', id)
    .order('due_date', { ascending: true })

  const createdDate = new Date(note.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/dashboard"
            className="text-xs tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
          >
            ← Dashboard
          </Link>
          <p className="text-xs tracking-widest uppercase text-[#C4A882]">{createdDate}</p>
        </div>

        {/* Note */}
        <article className="mb-10">
          <h1 className="text-2xl text-[#1C3144] mb-4">{note.title}</h1>

          {note.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={note.image_url}
              alt="Note image"
              className="w-full max-h-64 object-cover border border-[#C4A882]/30 mb-4"
            />
          )}

          {note.content && (
            <p className="text-[#3A3028] leading-relaxed whitespace-pre-wrap">{note.content}</p>
          )}
        </article>

        {/* Review schedule */}
        <section>
          <h2 className="text-xs tracking-widest uppercase text-[#C4A882] mb-4">Review Schedule</h2>
          <div className="space-y-2">
            {reviews?.map(review => (
              <div
                key={review.id}
                className="flex items-center justify-between border border-[#C4A882]/30 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs tracking-widest uppercase text-[#C4A882] w-12">
                    {intervalLabel(review.interval_day)}
                  </span>
                  <span className="text-sm text-[#3A3028]">
                    {new Date(review.due_date + 'T00:00:00').toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
                <span className={`text-xs tracking-widest uppercase ${
                  review.completed_at
                    ? 'text-[#C4A882]'
                    : 'text-[#8A7A6A]'
                }`}>
                  {review.completed_at ? 'Done ✓' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
