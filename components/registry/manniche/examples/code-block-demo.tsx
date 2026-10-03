import { CodeBlock } from '@/registry/manniche/code-block/code-block'

const code = `export function total(items: { price: number; qty: number }[]) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}`

export default function CodeBlockDemo() {
  return <CodeBlock filename="lib/total.ts" code={code} lineNumbers />
}
