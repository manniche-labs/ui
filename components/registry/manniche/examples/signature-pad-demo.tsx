import { SignaturePad } from '@/registry/manniche/signature-pad/signature-pad'

export default function SignaturePadDemo() {
  return (
    <div className="flex justify-center">
      <SignaturePad onSign={(s) => console.log(s.kind === 'drawn' ? 'PNG ready' : `typed: ${s.name}`)} />
    </div>
  )
}
