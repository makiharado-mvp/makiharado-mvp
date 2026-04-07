'use client'

import { useState, useTransition } from 'react'
import { deleteAccount } from '@/app/actions'

export default function DeleteAccountForm() {
  const [step, setStep] = useState<'idle' | 'confirm'>('idle')
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteAccount()
      if (result?.error) {
        setError(result.error)
        setStep('idle')
        setInput('')
      }
      // On success the server redirects — no client action needed
    })
  }

  if (step === 'idle') {
    return (
      <div className="border border-[#C4A882]/20 p-6">
        <p className="text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-2">Danger zone</p>
        <p className="text-sm text-[#3A3028] mb-4 leading-relaxed">
          Permanently delete your account and all associated data.
          This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setStep('confirm')}
          className="text-[10px] tracking-widest uppercase text-red-400 hover:text-red-600 transition-colors"
        >
          Delete account
        </button>
      </div>
    )
  }

  return (
    <div className="border border-red-200 p-6 space-y-5">
      <div>
        <p className="text-[10px] tracking-widest uppercase text-red-500 mb-3">
          This cannot be undone
        </p>
        <p className="text-sm text-[#3A3028] leading-relaxed mb-3">
          The following will be permanently deleted:
        </p>
        <ul className="text-xs text-[#8A7A6A] space-y-1 list-disc list-inside">
          <li>Your account and login credentials</li>
          <li>All posts and diary entries</li>
          <li>All notes and review records</li>
          <li>All uploaded images</li>
          <li>Your notification settings</li>
        </ul>
      </div>

      <div>
        <p className="text-sm text-[#3A3028] mb-2">
          Type <span className="font-mono tracking-widest text-[#1C3144]">DELETE</span> to confirm.
        </p>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="DELETE"
          disabled={pending}
          autoComplete="off"
          className="w-full border border-[#C4A882]/40 bg-white px-3 py-2 text-sm text-[#3A3028] focus:border-red-300 outline-none disabled:opacity-50"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 leading-relaxed">{error}</p>
      )}

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => { setStep('idle'); setInput(''); setError(null) }}
          disabled={pending}
          className="text-[10px] tracking-widest uppercase text-[#8A7A6A] hover:text-[#1C3144] transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending || input !== 'DELETE'}
          className="text-[10px] tracking-widest uppercase text-red-500 hover:text-red-700 transition-colors disabled:opacity-30"
        >
          {pending ? 'Deleting…' : 'Permanently delete'}
        </button>
      </div>
    </div>
  )
}
