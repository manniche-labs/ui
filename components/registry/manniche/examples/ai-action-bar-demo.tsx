import { Bold, Heading, Image, Link } from 'lucide-react'
import { AiActionBar } from '@/registry/manniche/ai-action-bar/ai-action-bar'

export default function AiActionBarDemo() {
  return (
    <div className="flex justify-center">
      <AiActionBar
        onAsk={(prompt) => console.log('send to the agent:', prompt)}
        placeholder="Make the product text shorter…"
        tools={[
          { id: 'heading', label: 'Heading', icon: Heading },
          { id: 'bold', label: 'Bold', icon: Bold },
          { id: 'link', label: 'Link', icon: Link },
          { id: 'image', label: 'Image', icon: Image },
        ]}
      />
    </div>
  )
}
