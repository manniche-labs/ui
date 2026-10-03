import { CopyButton } from '@/registry/manniche/copy-button/copy-button'

export default function CopyButtonDemo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <code className="rounded-xl bg-muted px-3 py-2.5 font-mono text-sm">SPRING-25</code>
      <CopyButton value="SPRING-25" />
    </div>
  )
}
