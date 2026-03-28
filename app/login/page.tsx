'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from '@/app/actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FAFAF7' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[6px] uppercase text-[#C4A882] mb-2">Makiharado</p>
          <h1 className="text-2xl text-[#1C3144]">Welcome back</h1>
        </div>

        <form action={action} className="space-y-4">
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

        <p className="text-center text-xs text-[#8A7A6A] mt-6">
          No account?{' '}
          <Link href="/signup" className="text-[#1C3144] underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
