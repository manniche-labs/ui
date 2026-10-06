import { CtaSignup } from '@/registry/manniche/cta-signup/cta-signup'

// The demo "sends" by waiting a moment. An address that starts with "fail" rejects, to show the error state.
const fakeSend = ({ email }: { email: string }) =>
  new Promise<void>((resolve, reject) => setTimeout(() => (email.startsWith('fail') ? reject(new Error('demo')) : resolve()), 1200))

export default function CtaSignupDemo() {
  return (
    <CtaSignup
      title="Notes from the studio, once a month."
      description="What we are building in Munich and Aalborg, what we learned and what we would do differently."
      items={[
        'One short letter on the first Monday of the month',
        'Working files and templates we use ourselves',
        'First word when we open a spot for a new project',
        'Unsubscribe with one click, any time',
      ]}
      consent={
        <>
          We use your address only to send this letter. Read the{' '}
          <a href="https://example.com/privacy">privacy policy</a>.
        </>
      }
      onSubmit={fakeSend}
    />
  )
}
