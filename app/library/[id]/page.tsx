import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LibraryDeleteButton from '@/components/LibraryDeleteButton'
import type { LibraryPost } from '@/types'

export const revalidate = 60

export default async function LibraryPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Public query — never selects source_note_id
  const { data: post } = await supabase
    .from('library_posts')
    .select('id, user_id, title, content, category, tags, created_at, library_images(id, image_url, position, storage_path)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  // Check ownership for showing management controls (no data leaked — just a boolean)
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === post.user_id

  const images = ((post as LibraryPost).library_images ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/library"
            className="text-xs tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
          >
            ← Library
          </Link>
          <span className="text-[10px] tracking-widest uppercase text-[#C4A882]">
            {post.category}
          </span>
        </div>

        {/* Post */}
        <article className="mb-10">
          <h1 className="text-2xl text-[#1C3144] mb-2">{post.title}</h1>
          <p className="text-[10px] text-[#C4A882]/60 mb-6">
            {new Date(post.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>

          {/* Images */}
          {images.map(img => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.image_url}
              alt={post.title}
              className="w-full object-contain border border-[#C4A882]/20 mb-4"
            />
          ))}

          {/* Content */}
          <p className="text-[#3A3028] leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {/* Tags */}
          {(post as LibraryPost).tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-6">
              {(post as LibraryPost).tags.map(tag => (
                <span
                  key={tag}
                  className="text-[10px] tracking-wide text-[#8A7A6A] border border-[#C4A882]/30 px-2 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Owner controls */}
        {isOwner && (
          <div className="border-t border-[#C4A882]/20 pt-4 flex items-center justify-between">
            <Link
              href="/library/new"
              className="text-[10px] tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
            >
              + Share another note
            </Link>
            <LibraryDeleteButton postId={post.id} />
          </div>
        )}

      </div>
    </div>
  )
}
