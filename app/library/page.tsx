import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LibraryCard from '@/components/LibraryCard'
import { LIBRARY_TOP_CATEGORIES, LIBRARY_MID_CATEGORIES, LIBRARY_ITEM_TYPES } from '@/types'
import type { LibraryPost, LibraryTopCategory } from '@/types'

export const revalidate = 60

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ top?: string; mid?: string; type?: string }>
}) {
  const { top, mid, type } = await searchParams

  const activeTop  = LIBRARY_TOP_CATEGORIES.includes(top as LibraryTopCategory)
    ? (top as LibraryTopCategory) : null
  const midOptions = activeTop ? LIBRARY_MID_CATEGORIES[activeTop] : []
  const activeMid  = activeTop && midOptions.includes(mid as never) ? mid! : null
  const activeType = activeTop === 'language' && LIBRARY_ITEM_TYPES.includes(type as never)
    ? type! : null

  // math/science always sort by title; language by newest first
  const sortByTitle = activeMid === 'math' || activeMid === 'science'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Public query — never selects source_note_id
  let query = supabase
    .from('library_posts')
    .select('id, user_id, title, content, top_category, mid_category, item_type, tags, created_at, updated_at, library_images(id, image_url, position)')
    .limit(50)

  if (activeTop)  query = query.eq('top_category', activeTop)
  if (activeMid)  query = query.eq('mid_category', activeMid)
  if (activeType) query = query.eq('item_type', activeType)

  query = sortByTitle
    ? query.order('title', { ascending: true })
    : query.order('created_at', { ascending: false })

  const { data: posts } = await query

  // Build hrefs for filter tabs
  function topHref(t: string)    { return `/library?top=${t}` }
  function midHref(m: string)    { return `/library?top=${activeTop}&mid=${m}` }
  function typeHref(ty: string)  { return `/library?top=${activeTop}&mid=${activeMid}&type=${ty}` }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[10px] tracking-[6px] uppercase text-[#C4A882] mb-1">Makiharado</p>
            <h1 className="text-2xl text-[#1C3144]">Library</h1>
            <p className="text-xs text-[#8A7A6A] mt-1">Learning notes shared by the community</p>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <Link href="/dashboard"
              className="text-xs tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors">
              ← Dashboard
            </Link>
            {user && (
              <Link href="/library/new"
                className="text-xs tracking-widest uppercase bg-[#1C3144] text-[#FAFAF7] px-4 py-2 hover:bg-[#C4A882] transition-colors">
                Share a note
              </Link>
            )}
          </div>
        </div>

        {/* Row 1 — top category */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Link href="/library" className={tabClass(!activeTop)}>All</Link>
          {LIBRARY_TOP_CATEGORIES.map(t => (
            <Link key={t} href={topHref(t)} className={tabClass(activeTop === t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Link>
          ))}
        </div>

        {/* Row 2 — mid category (shown when top is selected) */}
        {activeTop && (
          <div className="flex flex-wrap gap-2 mb-3">
            <Link href={topHref(activeTop)} className={tabClass(!activeMid)}>All</Link>
            {midOptions.map(m => (
              <Link key={m} href={midHref(m)} className={tabClass(activeMid === m)}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Link>
            ))}
          </div>
        )}

        {/* Row 3 — item type (only for language) */}
        {activeTop === 'language' && activeMid && (
          <div className="flex flex-wrap gap-2 mb-3">
            <Link href={midHref(activeMid)} className={tabClass(!activeType)}>All types</Link>
            {LIBRARY_ITEM_TYPES.map(ty => (
              <Link key={ty} href={typeHref(ty)} className={tabClass(activeType === ty)}>
                {ty.charAt(0).toUpperCase() + ty.slice(1)}
              </Link>
            ))}
          </div>
        )}

        <div className="border-b border-[#C4A882]/20 mb-8" />

        {/* Post grid */}
        {!posts || posts.length === 0 ? (
          <div className="text-center py-20 border border-[#C4A882]/20">
            <p className="text-[#8A7A6A] text-sm">No posts yet in this category.</p>
            {user && (
              <Link href="/library/new"
                className="inline-block mt-4 text-xs tracking-widest uppercase text-[#C4A882] hover:text-[#1C3144] transition-colors">
                Be the first to share →
              </Link>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Books row — tight gap like books packed on a shelf */}
            {/* items-end: height-variant books all sit on the same shelf line */}
            <div className="flex gap-0 overflow-x-auto snap-x snap-mandatory items-end pt-4 px-2 pb-0">
              {(posts as LibraryPost[]).map(post => (
                <LibraryCard key={post.id} post={post} />
              ))}
            </div>
            {/* Shelf edge — thin, dark, heavy shadow */}
            <div
              className="mx-2"
              style={{
                height: '7px',
                borderTop: '1px solid #0A0503',
                background: 'linear-gradient(to bottom, #5A3A1A, #3A2010 50%, #1E1008)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.7), inset 0 2px 4px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function tabClass(active: boolean) {
  return [
    'text-[10px] tracking-widest uppercase px-3 py-1.5 border transition-colors',
    active
      ? 'bg-[#1C3144] text-[#FAFAF7] border-[#1C3144]'
      : 'border-[#C4A882]/40 text-[#8A7A6A] hover:border-[#C4A882]',
  ].join(' ')
}
