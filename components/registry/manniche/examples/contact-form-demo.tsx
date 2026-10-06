import { ContactForm } from '@/registry/manniche/contact-form/contact-form'

export default function ContactFormDemo() {
  return (
    <ContactForm
      heading="Tell us what you are building"
      intro="A few lines are enough. A person at Halden Studio reads every message."
      topics={[
        { id: 'project', label: 'New project' },
        { id: 'support', label: 'Support' },
        { id: 'other', label: 'Other' },
      ]}
      maxLength={400}
      consent={<>I agree that Halden Studio may store this message to answer it. See the <a className="underline underline-offset-4" href="https://example.com/privacy">privacy policy</a>.</>}
      info={{
        email: 'hello@example.com',
        phone: '+49 89 0000 0000',
        address: <>Example Street 1<br />80331 Munich</>,
        responseTime: 'We reply within two working days.',
      }}
      onSubmit={() => new Promise<void>((r) => setTimeout(r, 900))}
    />
  )
}
