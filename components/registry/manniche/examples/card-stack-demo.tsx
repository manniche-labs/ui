import { CardStack, type StackCard } from '@/registry/manniche/card-stack/card-stack'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'

// Example cards for the demo, not real accounts.
const CARDS: StackCard[] = [
  { id: 'everyday', name: 'Everyday', kind: 'Debit', ending: '4821', amount: 2091.2 },
  { id: 'travel', name: 'Travel', kind: 'Multi-currency', ending: '0937', amount: 612.08 },
  { id: 'online', name: 'Online', kind: 'Virtual', ending: '5530', amount: 145.2 },
  { id: 'savings', name: 'Savings', kind: 'Pot', ending: '1162', amount: 5470.58 },
]

const SHARED: StackCard[] = [
  { id: 'house', name: 'Household', kind: 'Joint', ending: '2210', amount: 1240.5 },
  { id: 'car', name: 'Car', kind: 'Pot', ending: '7781', amount: 386 },
  { id: 'trip', name: 'Summer trip', kind: 'Pot', ending: '3304', amount: 2150 },
  { id: 'kids', name: 'Kids', kind: 'Debit', ending: '6612', amount: 74.3 },
  { id: 'gifts', name: 'Gifts', kind: 'Virtual', ending: '9045', amount: 118.9 },
  { id: 'rainy', name: 'Rainy day', kind: 'Pot', ending: '5127', amount: 3900 },
]

const GIFT: StackCard[] = [
  { id: 'books', name: 'Northwind Books', amount: 40 },
  { id: 'cafe', name: 'Green Leaf Café', amount: 12.5 },
  { id: 'market', name: 'Harbour Market', amount: 25 },
]

const EUR = { currency: 'EUR', decimals: 2 }

export default function CardStackDemo() {
  return (
    <div className="grid w-full gap-4">
      <DataTile
        title="Cards"
        inverted
        footer={<span>Drag the front card away, tap it, or use the arrow keys; the next one comes forward. Example data.</span>}
      >
        <CardStack data={CARDS} label="Your cards" format={EUR} />
      </DataTile>
      <div className="grid gap-4 sm:grid-cols-2">
        <DataTile title="Shared wallet" density="compact" footer={<span>Six cards. Example data.</span>}>
          <CardStack data={SHARED} label="Shared cards" format={EUR} />
        </DataTile>
        <DataTile title="Gift cards" density="compact" footer={<span>A custom card face. Example data.</span>}>
          <CardStack
            data={GIFT}
            label="Gift cards"
            format={EUR}
            labels={{ readout: (c) => c.name }}
            renderCard={(card) => (
              <>
                <span aria-hidden className="text-[11px] font-medium tracking-[0.08em] uppercase opacity-80">
                  Gift card
                </span>
                <span aria-hidden className="text-[17px] leading-tight font-semibold tracking-[-0.01em]">
                  {card.name}
                </span>
              </>
            )}
          />
        </DataTile>
      </div>
    </div>
  )
}
