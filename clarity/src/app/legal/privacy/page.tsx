export const metadata = {
  title: 'Privacy Policy — Clarity',
}

const LAST_UPDATED = 'March 1, 2026'

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

      <Section title="Overview">
        <p>
          Clarity (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a personal finance tracking application.
          This policy explains what data we collect, how we use it, and your rights over it.
          By using Clarity you agree to the practices described here.
        </p>
      </Section>

      <Section title="Data we collect">
        <ul>
          <li><strong>Account data</strong> — your email address and a hashed password (or OAuth token) used to authenticate you.</li>
          <li><strong>Bank transaction data</strong> — when you connect a bank via Plaid, transaction records (merchant, amount, date, category) are fetched and stored in your personal account. We do not store your bank credentials; Plaid handles that securely.</li>
          <li><strong>Email receipt data</strong> — when you connect Gmail, we request read-only access to scan for financial emails (receipts, invoices). Email body text is sent to the Claude API for transaction extraction and is not stored beyond what is needed to produce a transaction record.</li>
          <li><strong>Uploaded receipts</strong> — images and PDFs you upload are sent to the Claude API for extraction and are not stored on our servers after processing.</li>
          <li><strong>Usage preferences</strong> — dashboard layout and notification settings you configure.</li>
        </ul>
      </Section>

      <Section title="How we use your data">
        <ul>
          <li>To provide and improve the Clarity service.</li>
          <li>To send you notification emails you have opted into (weekly digest, new subscription alerts, large transaction alerts).</li>
          <li>We do not sell your data to third parties.</li>
          <li>We do not use your financial data for advertising.</li>
        </ul>
      </Section>

      <Section title="Third-party services">
        <ul>
          <li><strong>Supabase</strong> — database and authentication hosting. Data is stored in Supabase&apos;s managed PostgreSQL database with row-level security enabled so only you can access your records.</li>
          <li><strong>Plaid</strong> — bank connection infrastructure. Plaid&apos;s privacy policy applies to data exchanged during bank linking.</li>
          <li><strong>Anthropic (Claude API)</strong> — AI-powered extraction. Email text and receipt images are sent to Claude for transaction data extraction. Anthropic&apos;s data usage policies apply.</li>
          <li><strong>Resend</strong> — transactional email delivery for notifications you have opted into.</li>
        </ul>
      </Section>

      <Section title="Data retention">
        <p>
          Your data is retained as long as your account is active. You may delete your account at any time
          from <strong>Settings → Account → Delete Account</strong>. Deletion permanently removes all your
          transactions, connections, and preferences from our database within 30 days.
        </p>
      </Section>

      <Section title="Your rights">
        <p>Depending on your jurisdiction you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your data (&quot;right to be forgotten&quot;).</li>
          <li>Object to or restrict certain processing.</li>
          <li>Data portability.</li>
        </ul>
        <p>To exercise any of these rights, contact us at the address below.</p>
      </Section>

      <Section title="Security">
        <p>
          We use industry-standard measures including HTTPS, row-level security in the database, and
          OAuth 2.0 for third-party integrations. No method of transmission or storage is 100% secure;
          use Clarity at your own risk.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy occasionally. We will notify you by email or in-app notification
          for material changes. Continued use after changes constitutes acceptance.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For privacy questions or data requests, email us at{' '}
          <a href="mailto:privacy@clarity.app" className="text-primary underline-offset-4 hover:underline">
            privacy@clarity.app
          </a>.
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
