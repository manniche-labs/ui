import { FooterStatement } from '@/registry/manniche/footer-statement/footer-statement'

// Halden Studio is an invented company. Every link goes to example.com.
export default function FooterStatementDemo() {
  return (
    <FooterStatement
      headline="Let's make the next one together."
      action={{ label: 'Start a project', href: 'https://example.com/start' }}
      email="hello@example.com"
      links={[
        { label: 'Work', href: 'https://example.com/work' },
        { label: 'Studio', href: 'https://example.com/about' },
        { label: 'Journal', href: 'https://example.com/journal' },
        { label: 'LinkedIn', href: 'https://example.com/linkedin', external: true },
      ]}
      owner="Halden Studio, Munich and Aalborg"
      legalLinks={[
        { label: 'Privacy', href: 'https://example.com/privacy' },
        { label: 'Imprint', href: 'https://example.com/imprint' },
      ]}
    />
  )
}
