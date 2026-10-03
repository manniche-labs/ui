import { FileDiff } from '@/registry/manniche/file-diff/file-diff'

const diff = `@@ -1,4 +1,4 @@ export function total
 export function total(items: Item[]) {
-  return items.reduce((sum, i) => sum + i.price, 0)
+  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
 }
`

export default function FileDiffDemo() {
  return <FileDiff filename="lib/total.ts" diff={diff} />
}
