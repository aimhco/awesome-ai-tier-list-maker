import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { ItemCard } from './ItemCard'
import type { Item } from '../data'

interface ItemBankProps {
  itemIds: string[]
  itemsById: Record<string, Item>
  showLabels: boolean
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
}

export function ItemBank({
  itemIds,
  itemsById,
  showLabels,
  onRemoveItem,
  editingItemId,
  editFormData,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onUpdateEditForm,
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
                isEditing={editingItemId === id}
                editFormData={editingItemId === id ? editFormData : null}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onUpdateEditForm={onUpdateEditForm}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  )
}
