import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Makiharado',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div className="mb-10">
          <Link
            href="/"
            className="text-[10px] tracking-[6px] uppercase text-[#C4A882] hover:text-[#1C3144] transition-colors"
          >
            Makiharado
          </Link>
        </div>

        <h1 className="text-2xl text-[#1C3144] mb-2">Privacy Policy</h1>
        <p className="text-[10px] tracking-widest uppercase text-[#C4A882] mb-12">
          Last updated: April 2026
        </p>

        <div className="space-y-10 text-sm text-[#3A3028] leading-relaxed">

          <section>
            <h2 className="text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-3">What we collect</h2>
            <p>
              We collect your email address when you create an account. It is used for
              authentication and, if you opt in, for review reminder notifications.
            </p>
          </section>

          <section>
            <h2 className="text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-3">Email notifications</h2>
            <p>
              You can choose to receive email reminders on days when you have notes to review.
              This is opt-in and can be turned off at any time from your dashboard.
              Notifications are triggered by your activity — specifically your review schedule.
            </p>
          </section>

          <section>
            <h2 className="text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-3">What you upload</h2>
            <p>
              Images and optional comments you upload as posts or notes are stored as part of
              the service. This content is associated with your account and is not visible to
              other users.
            </p>
            <p className="mt-3 text-[#8A7A6A]">
              Please do not upload sensitive personal information, identification documents,
              or content you would not want stored on a third-party server.
            </p>
          </section>

          <section>
            <h2 className="text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-3">How we use your data</h2>
            <p>
              Your data is used only to provide the Makiharado service — storing your notes,
              scheduling your reviews, displaying your posts, and sending reminders if enabled.
              We do not use it for advertising or analytics.
            </p>
          </section>

          <section>
            <h2 className="text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-3">Infrastructure</h2>
            <p>
              Makiharado is built on{' '}
              <span className="text-[#1C3144]">Supabase</span> (database and file storage),{' '}
              <span className="text-[#1C3144]">Vercel</span> (hosting), and{' '}
              <span className="text-[#1C3144]">Resend</span> (transactional email). Your data
              is processed and stored on their infrastructure.
              We do not intentionally share your personal data with any other third parties.
            </p>
          </section>

          <section>
            <h2 className="text-[10px] tracking-widest uppercase text-[#8A7A6A] mb-3">Contact</h2>
            <p>
              A contact method for privacy-related enquiries is currently being prepared
              and will be made available on this page in due course.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
