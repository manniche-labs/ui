import { useState } from 'react'
import { FooterSlim, type FooterSlimTheme } from '@/registry/manniche/footer-slim/footer-slim'

// Halden Studio is an invented company. Every link goes to example.com.
// The switch is controlled but this demo does not change the page theme: the library's own toggle does that.
export default function FooterSlimDemo() {
  const [theme, setTheme] = useState<FooterSlimTheme>('system')
  return (
    <FooterSlim
      brand="Halden Docs"
      links={[
        { label: 'Guides', href: 'https://example.com/guides' },
        { label: 'API', href: 'https://example.com/api' },
        { label: 'Status', href: 'https://example.com/status', external: true },
        { label: 'Privacy', href: 'https://example.com/privacy' },
      ]}
      owner="Halden Studio"
      theme={theme}
      onThemeChange={setTheme}
    />
  )
}
