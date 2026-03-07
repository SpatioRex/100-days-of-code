export const metadata = {
  title: 'Terms of Service — Clarity',
}

const LAST_UPDATED = 'March 1, 2026'

export default function TermsPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

      <Section title="Acceptance">
        <p>
          By creating an account or using Clarity you agree to these Terms of Service.
          If you do not agree, do not use the service.
        </p>
      </Section>

      <Section title="Description of service">
        <p>
          Clarity is a personal finance tracking tool that helps you view, categorise, and understand
          your financial transactions. It is provided on an &quot;as is&quot; and &quot;as available&quot; basis during beta.
        </p>
      </Section>

      <Section title="Eligibility">
        <p>
          You must be at least 18 years old and capable of entering a binding contract to use Clarity.
          By using the service you represent that you meet these requirements.
        </p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must provide accurate information when registering.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>Notify us immediately if you suspect unauthorised access.</li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Use Clarity for any unlawful purpose or in violation of any laws.</li>
          <li>Attempt to reverse-engineer, scrape, or disrupt the service.</li>
          <li>Share your account with others or create accounts on behalf of others.</li>
          <li>Upload malicious files or attempt to compromise the security of Clarity or its users.</li>
        </ul>
      </Section>

      <Section title="Third-party integrations">
        <p>
          Clarity integrates with Plaid, Google Gmail, and Anthropic Claude. Your use of those
          integrations is also subject to their respective terms of service. We are not responsible
          for third-party services.
        </p>
      </Section>

      <Section title="Data and privacy">
        <p>
          Our collection and use of personal data is governed by our{' '}
          <a href="/legal/privacy" className="text-primary underline-offset-4 hover:underline">Privacy Policy</a>,
          which is incorporated into these Terms.
        </p>
      </Section>

      <Section title="Financial information disclaimer">
        <p>
          Clarity is a <strong>tracking and organisational tool only</strong>. It does not provide
          financial advice, investment advice, tax advice, or any regulated financial service. Transaction
          data displayed may be incomplete or inaccurate. Always verify important financial information
          with your bank or a qualified financial professional.
        </p>
      </Section>

      <Section title="Beta service">
        <p>
          Clarity is currently in beta. Features may change, be removed, or be unavailable at any time.
          We reserve the right to modify or discontinue the service with or without notice.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, Clarity and its operators are not liable for any
          indirect, incidental, special, consequential, or punitive damages arising from your use of,
          or inability to use, the service — including loss of data or financial losses.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these Terms occasionally. Material changes will be communicated via email or
          in-app notification. Continued use after changes constitutes acceptance of the new Terms.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These Terms are governed by the laws of the jurisdiction in which Clarity operates, without
          regard to conflict-of-law principles.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these Terms?{' '}
          <a href="mailto:legal@clarity.app" className="text-primary underline-offset-4 hover:underline">
            legal@clarity.app
          </a>
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
