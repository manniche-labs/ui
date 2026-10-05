import { FlipWords } from '@/registry/manniche/flip-words/flip-words'

export default function FlipWordsDemo() {
  return (
    <p className="text-center font-serif text-3xl leading-tight">
      Websites that are <FlipWords words={['fast', 'honest', 'yours', 'found']} className="text-primary" />
    </p>
  )
}
