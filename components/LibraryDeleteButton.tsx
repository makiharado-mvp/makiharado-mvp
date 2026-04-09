'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteLibraryPost } from '@/app/actions'

export default function LibraryDeleteButton({ postId }: { postId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteLibraryPost(postId)
      if (result?.error) {
        setError(result.error)
        setConfirming(false)
      } else {
        router.push('/library')
      }
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[10px] tracking-widest uppercase text-[#8A7A6A]/60 hover:text-red-500 transition-colors"
      >
        Delete post
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <span className="text-[10px] text-[#8A7A6A]">Are you sure?</span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-[10px] tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-[10px] tracking-widest uppercase text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
      >
        {pending ? 'Deleting…' : 'Confirm'}
      </button>
    </div>
  )
}
