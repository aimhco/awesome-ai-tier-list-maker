import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import type { Item } from '../data'

interface ItemCardProps {
  item: Item
  hideRemove?: boolean
  showLabel?: boolean
  onRemove?: (id: string) => void
}

export function ItemCard({
  item,
  hideRemove = false,
  showLabel = true,
  onRemove,
}: ItemCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      className="item-card"
      style={style}
      {...attributes}
      {...listeners}
    >
      {!hideRemove && !isDragging && onRemove && (
        <button
          type="button"
          className="item-card__remove"
          aria-label={`Remove ${item.label}`}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            onRemove(item.id)
          }}
        >
          ×
        </button>
      )}
      {item.image ? (
        <img src={item.image} alt={item.label} />
      ) : (
        <div
          className="item-card__fallback"
          style={{ backgroundColor: item.color ?? '#323232' }}
        >
          <span>{(item.badge ?? item.label.slice(0, 2)).toUpperCase()}</span>
        </div>
      )}
      {showLabel ? <p>{item.label}</p> : null}
    </div>
  )
}
