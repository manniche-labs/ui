import { ContactPeople } from '@/registry/manniche/contact-people/contact-people'

export default function ContactPeopleDemo() {
  return (
    <ContactPeople
      heading="Talk to a person"
      intro="Invented people at an invented studio."
      people={[
        { id: 'a', name: 'Anna Beispiel', role: 'Studio lead', team: 'Munich', languages: ['English', 'Deutsch'], email: 'anna@example.com', bookHref: 'https://example.com/book/anna' },
        { id: 'b', name: 'Jonas Eksempel', role: 'Design engineer', team: 'Aalborg', languages: ['English', 'Dansk'], email: 'jonas@example.com' },
        { id: 'c', name: 'Mira Muster', role: 'Producer', team: 'Munich', languages: ['English', 'Deutsch'], email: 'mira@example.com', bookHref: 'https://example.com/book/mira' },
        { id: 'd', name: 'Sofie Test', role: 'Support', team: 'Aalborg', languages: ['English', 'Dansk'], email: 'sofie@example.com' },
      ]}
    />
  )
}
