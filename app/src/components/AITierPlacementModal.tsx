import { useState, useMemo } from 'react'
import type { AITierPlacement } from '../types/ai'
import type { Tier } from '../data'

interface AITierPlacementModalProps {
  placements: AITierPlacement[]
  isLoading: boolean
  error: string | null
  tiers: Tier[]
  itemsById: Record<string, { id: string; label: string }>
  onApplySelected: (selectedPlacements: AITierPlacement[]) => void
  onCancel: () => void
  onRetry: () => void
}

export function AITierPlacementModal({
  placements,
  isLoading,
  error,
  tiers,
  itemsById,
  onApplySelected,
  onCancel,
  onRetry,
}: AITierPlacementModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Group placements by tier
  const placementsByTier = useMemo(() => {
    const grouped = new Map<string, AITierPlacement[]>()

    placements.forEach((placement) => {
      const existing = grouped.get(placement.tier) || []
      grouped.set(placement.tier, [...existing, placement])
    })

    return grouped
  }, [placements])

  const toggleSelection = (itemId: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedIds(newSelection)
  }

  const toggleAll = () => {
    if (selectedIds.size === placements.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(placements.map(p => p.itemId)))
    }
  }

  const handleApplySelected = () => {
    const selected = placements.filter(p => selectedIds.has(p.itemId))
    onApplySelected(selected)
  }

  const getTierLabel = (tierId: string) => {
    return tiers.find(t => t.id === tierId)?.label || tierId
  }

  const getTierColor = (tierId: string) => {
    return tiers.find(t => t.id === tierId)?.color || '#666'
  }

  return (
    <div className="settings-modal__backdrop" data-hide-in-screenshot="true">
      <div className="settings-modal ai-placement-modal">
        <div className="settings-modal__title">
          <h2>AI Auto-Placement</h2>
          <button
            className="item-card__remove settings-modal__close"
            onClick={onCancel}
            aria-label="Close placement suggestions"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="ai-placement-modal__content">
          {isLoading && (
            <div className="ai-placement-modal__loading">
              <p>Analyzing items and generating placements...</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                This may take 10-15 seconds
              </p>
            </div>
          )}

          {error && (
            <div className="ai-placement-modal__error">
              <p>{error}</p>
              <button
                type="button"
                className="button button--secondary"
                onClick={onRetry}
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && placements.length === 0 && (
            <div className="ai-placement-modal__empty">
              <p>No placements generated. Make sure you have items in your Item Bank.</p>
            </div>
          )}

          {!isLoading && !error && placements.length > 0 && (
            <>
              <div className="ai-placement-modal__header">
                <p className="ai-placement-modal__description">
                  AI suggests placing {placements.length} item{placements.length !== 1 ? 's' : ''}:
                </p>
                <button
                  type="button"
                  className="button button--small"
                  onClick={toggleAll}
                >
                  {selectedIds.size === placements.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="ai-placement-modal__tiers">
                {tiers.map((tier) => {
                  const tierPlacements = placementsByTier.get(tier.id) || []
                  if (tierPlacements.length === 0) return null

                  return (
                    <div key={tier.id} className="ai-placement-tier">
                      <div
                        className="ai-placement-tier__header"
                        style={{ backgroundColor: tier.color, color: tier.textColor }}
                      >
                        <span className="ai-placement-tier__label">{tier.label}</span>
                        <span className="ai-placement-tier__count">
                          {tierPlacements.length} item{tierPlacements.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="ai-placement-tier__items">
                        {tierPlacements.map((placement) => {
                          const item = itemsById[placement.itemId]
                          if (!item) return null

                          return (
                            <div
                              key={placement.itemId}
                              className={`ai-placement-item${
                                selectedIds.has(placement.itemId) ? ' is-selected' : ''
                              }`}
                              onClick={() => toggleSelection(placement.itemId)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.has(placement.itemId)}
                                onChange={() => toggleSelection(placement.itemId)}
                                className="ai-placement-item__checkbox"
                              />
                              <div className="ai-placement-item__content">
                                <div className="ai-placement-item__header">
                                  <span className="ai-placement-item__label">
                                    {item.label}
                                  </span>
                                  <span
                                    className="ai-placement-item__confidence"
                                    title={`Confidence: ${Math.round(placement.confidence * 100)}%`}
                                  >
                                    {Math.round(placement.confidence * 100)}%
                                  </span>
                                </div>
                                <p className="ai-placement-item__reasoning">
                                  {placement.reasoning}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="settings-modal__footer">
          <button
            type="button"
            className="button button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={handleApplySelected}
            disabled={isLoading || selectedIds.size === 0}
          >
            Apply Selected ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  )
}
