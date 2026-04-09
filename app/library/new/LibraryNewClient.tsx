'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createLibraryPost } from '@/app/actions'
import { compressImage } from '@/lib/compressImage'
import { LIBRARY_CATEGORIES } from '@/types'

type SourceNote = { id: string; title: string; content: string } | null

export default function LibraryNewClient({ sourceNote }: { sourceNote: SourceNote }) {
  const [step, setStep] = useState<'fill' | 'confirm'>('fill')
  const [formError, setFormError] = useState<string | null>(null)
  const [compressError, setCompressError] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [pending, startTransition] = useTransition()

  // Form field state — needed to carry values from fill → confirm → submit
  const [title, setTitle]       = useState(sourceNote?.title ?? '')
  const [content, setContent]   = useState(sourceNote?.content ?? '')
  const [category, setCategory] = useState<string>(LIBRARY_CATEGORIES[0])
  const [tagsInput, setTagsInput] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageCount, setImageCount] = useState(0)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setImageFiles(files)
    setImageCount(files.length)
  }

  function handleFillSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!title.trim()) { setFormError('Title is required.'); return }
    if (!content.trim()) { setFormError('Content is required.'); return }
    if (imageCount > 2) { setFormError('Maximum 2 images.'); return }
    setStep('confirm')
  }

  async function handlePublish() {
    setFormError(null)
    setCompressError(null)
    setCompressing(true)

    let compressed: File[]
    try {
      compressed = []
      for (const f of imageFiles) {
        compressed.push(await compressImage(f))
      }
    } catch (err) {
      setCompressing(false)
      setCompressError(err instanceof Error ? err.message : 'Image compression failed.')
      return
    }
    setCompressing(false)

    const data = new FormData()
    data.set('title', title.trim())
    data.set('content', content.trim())
    data.set('category', category)
    data.set('tags', tagsInput)
    if (sourceNote) data.set('source_note_id', sourceNote.id)
    for (const f of compressed) data.append('image', f)

    startTransition(async () => {
      const result = await createLibraryPost(undefined, data)
      if (result?.error) {
        setFormError(result.error)
        setStep('fill')
      }
      // On success, createLibraryPost calls redirect() — navigation is automatic
    })
  }

  const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)

  // ── Step 1: Fill form ─────────────────────────────────────────
  if (step === 'fill') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[10px] tracking-[6px] uppercase text-[#C4A882] mb-1">Library</p>
            <h1 className="text-xl text-[#1C3144]">Share a note</h1>
          </div>
          <Link
            href="/library"
            className="text-xs tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
          >
            ← Library
          </Link>
        </div>

        {sourceNote && (
          <div className="border border-[#C4A882]/30 bg-[#C4A882]/5 px-4 py-3 mb-6">
            <p className="text-[10px] tracking-widest uppercase text-[#C4A882]">
              Sharing from private note
            </p>
            <p className="text-xs text-[#8A7A6A] mt-1">
              Content has been pre-filled from your note. Edit before publishing — your original note stays private.
            </p>
          </div>
        )}

        <form onSubmit={handleFillSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. How I use fountain pens for spaced repetition"
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882] placeholder:text-[#C4A882]/40 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882] outline-none"
            >
              {LIBRARY_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Tags
              <span className="normal-case tracking-normal text-[#C4A882] ml-1">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. fountain-pen, washi-tape, review"
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882] placeholder:text-[#C4A882]/40 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
              required
              placeholder="Share your learning, tips, or experience..."
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882] placeholder:text-[#C4A882]/40 resize-none outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-1.5">
              Images
              <span className="normal-case tracking-normal text-[#C4A882] ml-1">(0–2, optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="w-full border border-[#C4A882]/40 bg-white px-3 py-1.5 text-[#3A3028] text-sm file:mr-3 file:border-0 file:bg-[#1C3144] file:text-[#FAFAF7] file:text-xs file:tracking-widest file:uppercase file:px-3 file:py-1 file:cursor-pointer"
            />
            {imageCount > 2 && (
              <p className="text-xs text-red-600 mt-1">Maximum 2 images. Please remove {imageCount - 2}.</p>
            )}
          </div>

          {formError && <p className="text-xs text-red-600">{formError}</p>}

          <button
            type="submit"
            className="w-full bg-[#1C3144] text-[#FAFAF7] py-3 text-xs tracking-widest uppercase hover:bg-[#C4A882] transition-colors"
          >
            Review before publishing →
          </button>
        </form>
      </div>
    )
  }

  // ── Step 2: Confirm ───────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-[10px] tracking-[6px] uppercase text-[#C4A882] mb-1">Library</p>
          <h1 className="text-xl text-[#1C3144]">Review before publishing</h1>
        </div>
        <button
          type="button"
          onClick={() => setStep('fill')}
          className="text-xs tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors"
        >
          ← Edit
        </button>
      </div>

      {/* Public visibility warning */}
      <div className="border border-[#C4A882] bg-[#C4A882]/10 px-4 py-3 mb-6">
        <p className="text-[10px] tracking-widest uppercase text-[#C4A882] mb-1">
          This will be publicly visible
        </p>
        <p className="text-xs text-[#3A3028]">
          Once published, this post will be visible to all visitors — including people who are not signed in.
          Your private notes remain private. Only the content below will be shared.
        </p>
      </div>

      {/* Preview */}
      <div className="border border-[#C4A882]/30 bg-white p-5 space-y-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest uppercase text-[#C4A882]">{category}</span>
        </div>
        <h2 className="text-[#1C3144] text-lg">{title}</h2>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <span key={tag} className="text-[10px] text-[#8A7A6A] border border-[#C4A882]/30 px-1.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm text-[#3A3028] leading-relaxed whitespace-pre-wrap">{content}</p>
        {imageFiles.length > 0 && (
          <p className="text-[10px] text-[#8A7A6A]">
            {imageFiles.length} image{imageFiles.length !== 1 ? 's' : ''} will be uploaded
          </p>
        )}
      </div>

      {compressError && <p className="text-xs text-red-600 mb-3">{compressError}</p>}
      {formError && <p className="text-xs text-red-600 mb-3">{formError}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep('fill')}
          disabled={compressing || pending}
          className="flex-1 border border-[#C4A882]/40 text-[#8A7A6A] py-3 text-xs tracking-widest uppercase hover:border-[#C4A882] transition-colors disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={compressing || pending}
          className="flex-1 bg-[#1C3144] text-[#FAFAF7] py-3 text-xs tracking-widest uppercase hover:bg-[#C4A882] transition-colors disabled:opacity-50"
        >
          {compressing ? 'Compressing…' : pending ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  )
}
