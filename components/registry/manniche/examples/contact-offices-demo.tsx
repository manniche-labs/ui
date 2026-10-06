import { ContactOffices } from '@/registry/manniche/contact-offices/contact-offices'

const WEEK = [1, 2, 3, 4, 5].map((day) => ({ day, open: '09:00', close: '17:00' }))

export default function ContactOfficesDemo() {
  return (
    <ContactOffices
      heading="Two offices, one team"
      intro="Invented addresses and numbers."
      offices={[
        { id: 'muc', city: 'Munich', address: 'Example Street 1, 80331 Munich', phone: '+49 89 0000 0000', timeZone: 'Europe/Berlin', hours: WEEK, directionsHref: 'https://example.com/map/munich' },
        { id: 'aal', city: 'Aalborg', address: 'Eksempelvej 2, 9000 Aalborg', phone: '+45 00 00 00 00', timeZone: 'Europe/Copenhagen', hours: WEEK, directionsHref: 'https://example.com/map/aalborg' },
      ]}
    />
  )
}
