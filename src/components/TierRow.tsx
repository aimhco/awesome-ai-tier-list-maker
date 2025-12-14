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
  editingItemId?: string | null
  editFormData?: {
    label: string
    badge: string
    color: string
  } | null
  onStartEdit?: (id: string) => void
  onSaveEdit?: () => void
  onCancelEdit?: () => void
  onUpdateEditForm?: (field: 'label' | 'badge' | 'color', value: string) => void
  showDistribution?: boolean
  distributionPercentage?: number
}

export function TierRow({
  tier,
  itemIds,
  itemsById,
  showLabels,
  labelWidth,
  onRemoveItem,
  editingItemId,
  editFormData,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onUpdateEditForm,
  showDistribution = false,
  distributionPercentage = 0,
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
              isEditing={editingItemId === id}
              editFormData={editingItemId === id ? editFormData : null}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onUpdateEditForm={onUpdateEditForm}
            />
          ))}
          {showDistribution && (
            <div className="tier-row__distribution">
              {distributionPercentage}%
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
