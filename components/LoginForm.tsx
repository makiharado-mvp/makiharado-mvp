'use client'

import { useActionState } from 'react'
import { signIn } from '@/app/actions'

export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined)

  return (
    <form action={action} className="space-y-4">
      {nextPath && (
        <input type="hidden" name="next" value={nextPath} />
      )}

      <div>
        <label className="block text-xs tracking-widest uppercase text-[#8A7A6A] mb-1.5">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882]"
        />
      </div>

      <div>
        <label className="block text-xs tracking-widest uppercase text-[#8A7A6A] mb-1.5">
          Password
        </label>
        <input
          name="password"
          type="password"
          required
          className="w-full border border-[#C4A882]/40 bg-white px-3 py-2.5 text-[#3A3028] text-sm focus:border-[#C4A882]"
        />
      </div>

      {state?.error && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#1C3144] text-[#FAFAF7] py-2.5 text-xs tracking-widest uppercase hover:bg-[#C4A882] transition-colors disabled:opacity-50"
      >
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
