import { Mail, MessageCircle, Phone, MapPin } from 'lucide-react'
import { ContactChannels } from '@/registry/manniche/contact-channels/contact-channels'

export default function ContactChannelsDemo() {
  return (
    <ContactChannels
      heading="Pick the way that suits you"
      intro="Halden Studio is a small team in Munich and Aalborg. Every channel below goes to a real person."
      recommendedId="email"
      channels={[
        { id: 'email', icon: <Mail />, title: 'Email', detail: 'hello@example.com', action: { label: 'Write to us', href: 'mailto:hello@example.com' }, responseTime: 'within 2 working days' },
        { id: 'phone', icon: <Phone />, title: 'Phone', detail: '+49 89 0000 0000, Mon to Fri, 09:00 to 17:00', action: { label: 'Call', href: 'tel:+498900000000' }, responseTime: 'at once in opening hours' },
        { id: 'chat', icon: <MessageCircle />, title: 'Chat', detail: 'A short message in our chat room.', action: { label: 'Open chat', href: 'https://example.com/chat', external: true }, responseTime: 'within 1 hour' },
        { id: 'visit', icon: <MapPin />, title: 'In person', detail: 'Example Street 1, Munich. By appointment.', action: { label: 'Book a visit', href: 'https://example.com/visit', external: true }, responseTime: 'within 1 working day' },
      ]}
      faq={[
        { question: 'Which channel is the fastest?', answer: 'Chat during opening hours. Email is best when you want to attach files.' },
        { question: 'Do you work in other languages?', answer: 'Yes. We answer in English, German and Danish.' },
        { question: 'Can I send a project brief?', answer: 'Yes. Email it to us, and say what you need and by when.' },
      ]}
    />
  )
}
