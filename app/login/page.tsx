import Link from 'next/link'
import LoginForm from '@/components/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  // Only pass same-origin paths to prevent open redirect
  const nextPath = next?.startsWith('/') ? next : undefined

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FAFAF7' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[6px] uppercase text-[#C4A882] mb-2">Makiharado</p>
          <h1 className="text-2xl text-[#1C3144]">Welcome back</h1>
        </div>
        <LoginForm nextPath={nextPath} />
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
