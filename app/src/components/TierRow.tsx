import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { ItemCard } from './ItemCard'
import type { Item, Tier } from '../data'

interface TierRowProps {
  tier: Tier
  itemIds: string[]
  itemsById: Record<string, Item>
  showLabels: boolean
  labelWidth: number
  onRemoveItem: (id: string) => void
}

export function TierRow({
  tier,
  itemIds,
  itemsById,
  showLabels,
  labelWidth,
  onRemoveItem,
}: TierRowProps) {
  const { isOver, setNodeRef } = useDroppable({ id: tier.id })

  return (
    <div
      className="tier-row"
      style={
        {
          ['--tier-label-width' as string]: `${labelWidth}px`,
          ['--tier-label-length' as string]: `${tier.label.length}`,
        } as React.CSSProperties
      }
    >
      <div
        className="tier-row__label"
        style={{
          backgroundColor: tier.color,
          color: tier.textColor,
        }}
      >
        {tier.label}
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`tier-row__dropzone${isOver ? ' is-over' : ''}`}
        >
          {itemIds.map((id) => (
            <ItemCard
              key={id}
              item={itemsById[id]}
              showLabel={showLabels}
              onRemove={onRemoveItem}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
