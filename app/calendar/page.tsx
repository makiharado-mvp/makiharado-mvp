import { redirect } from 'next/navigation'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  redirect(date ? `/dashboard?date=${date}` : '/dashboard')
}
