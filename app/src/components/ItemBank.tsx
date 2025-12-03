import { useState, useRef, useEffect } from 'react'
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
  onAddTextItem?: () => void
  onUploadImages?: () => void
  onAISuggestions?: () => void
  onToggleHideTitles?: () => void
  onResetPlacements?: () => void
  presentationMode?: boolean
  aiEnabled?: boolean
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
  onAddTextItem,
  onUploadImages,
  onAISuggestions,
  onToggleHideTitles,
  onResetPlacements,
  presentationMode = false,
  aiEnabled = false,
}: ItemBankProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'bank' })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleAddTextItemClick = () => {
    setIsDropdownOpen(false)
    onAddTextItem?.()
  }

  const handleUploadImagesClick = () => {
    setIsDropdownOpen(false)
    onUploadImages?.()
  }

  const handleAISuggestionsClick = () => {
    setIsDropdownOpen(false)
    onAISuggestions?.()
  }

  return (
    <section className="item-bank" data-item-bank="wrapper">
      <header data-item-bank="header">
        <div className="item-bank__header-content">
          <div className="item-bank__header-text">
            <h2>Item Bank</h2>
            <p data-item-bank="subtitle">Drag items into a tier below to build your ranking.</p>
          </div>
          {!presentationMode && (
            <div className="item-bank__actions" data-hide-in-screenshot="true">
              <div className="item-bank__add-button-container" ref={dropdownRef}>
                <button
                  type="button"
                  className="item-bank__add-button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-label="Add items"
                  aria-expanded={isDropdownOpen}
                  title="Add Items"
                >
                  +
                </button>
                {isDropdownOpen && (
                  <div className="item-bank__dropdown">
                    <button
                      type="button"
                      className="item-bank__dropdown-option"
                      onClick={handleAddTextItemClick}
                    >
                      Add Text Item(s)
                    </button>
                    <button
                      type="button"
                      className="item-bank__dropdown-option"
                      onClick={handleUploadImagesClick}
                    >
                      Upload Image(s)
                    </button>
                    {aiEnabled && (
                      <button
                        type="button"
                        className="item-bank__dropdown-option"
                        onClick={handleAISuggestionsClick}
                      >
                        AI Suggestions ✨
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="item-bank__action-button"
                onClick={onToggleHideTitles}
                aria-pressed={!showLabels}
                title={showLabels ? 'Hide all item titles' : 'Show all item titles'}
              >
                {showLabels ? 'Hide Item Titles' : 'Show Item Titles'}
              </button>
              <button
                type="button"
                className="item-bank__action-button"
                onClick={onResetPlacements}
                aria-label="Reset tiers"
                title="Move all items back to Item Bank"
              >
                Reset Tiers
              </button>
            </div>
          )}
        </div>
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
