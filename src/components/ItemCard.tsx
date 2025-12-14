import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import type { Item } from '../data'

// Calculate if a color is dark and needs white text
function shouldUseWhiteText(hexColor: string): boolean {
  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // If luminance is less than 0.5, use white text
  return luminance < 0.5
}

interface ItemCardProps {
  item: Item
  hideRemove?: boolean
  showLabel?: boolean
  onRemove?: (id: string) => void
  isEditing?: boolean
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

export function ItemCard({
  item,
  hideRemove = false,
  showLabel = true,
  onRemove,
  isEditing = false,
  editFormData,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onUpdateEditForm,
}: ItemCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isEditing })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const handleDoubleClick = (event: React.MouseEvent) => {
    if (onStartEdit && !isEditing) {
      event.stopPropagation()
      onStartEdit(item.id)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isEditing) return

    if (event.key === 'Enter') {
      event.preventDefault()
      onSaveEdit?.()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onCancelEdit?.()
    }
  }

  const handleBlur = (event: React.FocusEvent) => {
    // Only save if we're not focusing another input within the card
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      onSaveEdit?.()
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`item-card${isEditing ? ' item-card--editing' : ''}`}
      style={style}
      {...(isEditing ? {} : attributes)}
      {...(isEditing ? {} : listeners)}
      onDoubleClick={handleDoubleClick}
      title={!isEditing && onStartEdit ? 'Double-click to edit (Enter to save, Esc to cancel)' : isEditing ? 'Editing: Enter to save, Esc to cancel' : ''}
    >
      {!hideRemove && !isDragging && onRemove && (
        <button
          type="button"
          className="item-card__remove"
          aria-label={`Remove ${item.label}`}
          title={`Remove ${item.label}`}
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

      {/* Image or color badge (not editable) */}
      {item.image ? (
        <img src={item.image} alt={item.label} />
      ) : isEditing && editFormData ? (
        <div
          className="item-card__fallback"
          style={{
            backgroundColor: editFormData.color,
            color: shouldUseWhiteText(editFormData.color) ? '#ffffff' : '#000000'
          }}
        >
          <span>{(editFormData.badge || editFormData.label.slice(0, 2)).toUpperCase()}</span>
        </div>
      ) : (
        <div
          className="item-card__fallback"
          style={{
            backgroundColor: item.color ?? '#323232',
            color: shouldUseWhiteText(item.color ?? '#323232') ? '#ffffff' : '#000000'
          }}
        >
          <span>{(item.badge ?? item.label.slice(0, 2)).toUpperCase()}</span>
        </div>
      )}

      {/* Label - editable or display */}
      {showLabel && (
        <div className="item-card__label-section">
          {isEditing && editFormData ? (
            <div className="item-card__edit-form" onBlur={handleBlur}>
              <input
                type="text"
                className="item-card__edit-input"
                value={editFormData.label}
                onChange={(e) => onUpdateEditForm?.('label', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Title"
                autoFocus
                maxLength={50}
              />
              {!item.image && (
                <>
                  <input
                    type="text"
                    className="item-card__edit-input item-card__edit-input--badge"
                    value={editFormData.badge}
                    onChange={(e) => onUpdateEditForm?.('badge', e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Code"
                    maxLength={2}
                  />
                  <input
                    type="color"
                    className="item-card__edit-input item-card__edit-input--color"
                    value={editFormData.color}
                    onChange={(e) => onUpdateEditForm?.('color', e.target.value)}
                  />
                </>
              )}
            </div>
          ) : (
            <p>{item.label}</p>
          )}
        </div>
      )}
    </div>
  )
}
