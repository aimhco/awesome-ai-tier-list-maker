import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { ItemCard } from './ItemCard'
import type { Item } from '../data'

interface ItemBankProps {
  itemIds: string[]
  itemsById: Record<string, Item>
  showLabels: boolean
  onRemoveItem: (id: string) => void
}

export function ItemBank({
  itemIds,
  itemsById,
  showLabels,
  onRemoveItem,
}: ItemBankProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'bank' })

  return (
    <section className="item-bank" data-item-bank="wrapper">
      <header data-item-bank="header">
        <h2>Item Bank</h2>
        <p data-item-bank="subtitle">Drag items into a tier below to build your ranking.</p>
      </header>
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`item-bank__grid${isOver ? ' is-over' : ''}`}
        >
          {itemIds.length === 0 ? (
            <p className="item-bank__empty">All items are placed.</p>
          ) : (
            itemIds.map((id) => (
              <ItemCard
                key={id}
                item={itemsById[id]}
                showLabel={showLabels}
                onRemove={onRemoveItem}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  )
}
