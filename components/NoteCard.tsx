import Link from 'next/link'
import type { Note } from '@/types'

export default function NoteCard({ note }: { note: Note }) {
  const date = new Date(note.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link href={`/notes/${note.id}`} className="block border border-[#C4A882]/30 bg-white p-4 hover:border-[#C4A882] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[#1C3144] font-medium truncate">{note.title}</p>
          {note.content && (
            <p className="text-sm text-[#8A7A6A] mt-1 line-clamp-2">{note.content}</p>
          )}
        </div>
        {note.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={note.image_url}
            alt=""
            className="shrink-0 w-14 h-14 object-cover border border-[#C4A882]/20"
          />
        )}
      </div>
      <p className="text-[10px] tracking-widest uppercase text-[#C4A882] mt-3">{date}</p>
    </Link>
  )
}
