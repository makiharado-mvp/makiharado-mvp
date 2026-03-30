import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/Nav'
import CalendarView from '@/components/CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <Nav email={user.email ?? ''} />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs tracking-[6px] uppercase text-[#C4A882] mb-1">Makiharado</p>
            <h1 className="text-xl text-[#1C3144]">Calendar</h1>
          </div>
          <a
            href="/posts/new"
            className="text-xs tracking-widest uppercase text-[#FAFAF7] bg-[#1C3144] px-4 py-2 hover:bg-[#C4A882] transition-colors"
          >
            + New Post
          </a>
        </div>
        <CalendarView userId={user.id} />
      </main>
    </div>
  )
}
