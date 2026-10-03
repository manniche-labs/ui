import { ReceiptPrinter } from '@/registry/manniche/receipt-printer/receipt-printer'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function ReceiptPrinterDemo() {
  return (
    <div className="flex min-h-[560px] justify-center">
      <ReceiptPrinter
        merchant="Corner Café"
        lines={[
          { label: 'Flat white', amount: 3.8 },
          { label: 'Croissant', amount: 2.9 },
          { label: 'Orange juice', amount: 4.2 },
        ]}
        onPay={async () => {
          await wait(1400)
          return { reference: Math.random().toString(36).slice(2, 8).toUpperCase() }
        }}
      />
    </div>
  )
}
