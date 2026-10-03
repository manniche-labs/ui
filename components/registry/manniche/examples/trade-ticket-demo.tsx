import { useState } from 'react'
import { TradeTicket, type TradeOrder } from '@/registry/manniche/trade-ticket/trade-ticket'

export default function TradeTicketDemo() {
  const [last, setLast] = useState<TradeOrder | null>(null)

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="max-w-sm text-center text-sm font-medium">Will the spring collection sell out before Friday?</p>
      <TradeTicket
        outcomes={[
          { id: 'yes', label: 'Yes', price: 0.62 },
          { id: 'no', label: 'No', price: 0.38 },
        ]}
        balance={250}
        onTrade={setLast}
      />
      <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
        {last && `${last.side === 'buy' ? 'Bought' : 'Sold'} ${last.shares.toFixed(1)} × ${last.outcome} for $${last.amount}`}
      </p>
    </div>
  )
}
