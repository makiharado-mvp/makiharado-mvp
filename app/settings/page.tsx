import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/Nav'
import DeleteAccountForm from '@/components/DeleteAccountForm'

export const metadata = {
  title: 'Settings — Makiharado',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <Nav email={user.email ?? ''} />
      <div className="max-w-xl mx-auto px-6 py-16">
        <p className="text-[10px] tracking-[6px] uppercase text-[#C4A882] mb-10">Settings</p>
        <DeleteAccountForm />
      </div>
    </div>
  )
}
