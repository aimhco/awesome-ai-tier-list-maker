import { useState } from 'react'
import type { AIItemSuggestion } from '../types/ai'

interface AIItemSuggestionsModalProps {
  suggestions: AIItemSuggestion[]
  isLoading: boolean
  error: string | null
  onAddSelected: (selectedLabels: string[]) => void
  onCancel: () => void
  onRetry: () => void
}

export function AIItemSuggestionsModal({
  suggestions,
  isLoading,
  error,
  onAddSelected,
  onCancel,
  onRetry,
}: AIItemSuggestionsModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices)
    if (newSelection.has(index)) {
      newSelection.delete(index)
    } else {
      newSelection.add(index)
    }
    setSelectedIndices(newSelection)
  }

  const handleAddSelected = () => {
    const selectedLabels = Array.from(selectedIndices)
      .map((index) => suggestions[index].label)
    onAddSelected(selectedLabels)
  }

  return (
    <div className="settings-modal__backdrop" data-hide-in-screenshot="true">
      <div className="settings-modal ai-suggestions-modal">
        <div className="settings-modal__title">
          <h2>AI Item Suggestions</h2>
          <button
            className="item-card__remove settings-modal__close"
            onClick={onCancel}
            aria-label="Close suggestions"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="ai-suggestions-modal__content">
          {isLoading && (
            <div className="ai-suggestions-modal__loading">
              <p>Generating AI suggestions...</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                This may take 10-15 seconds
              </p>
            </div>
          )}

          {error && (
            <div className="ai-suggestions-modal__error">
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

          {!isLoading && !error && suggestions.length === 0 && (
            <div className="ai-suggestions-modal__empty">
              <p>No suggestions generated.</p>
            </div>
          )}

          {!isLoading && !error && suggestions.length > 0 && (
            <>
              <p className="ai-suggestions-modal__description">
                Select items to add to your tier list:
              </p>
              <div className="ai-suggestions-modal__list">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`ai-suggestion-item${
                      selectedIndices.has(index) ? ' is-selected' : ''
                    }`}
                    onClick={() => toggleSelection(index)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(index)}
                      onChange={() => toggleSelection(index)}
                      className="ai-suggestion-item__checkbox"
                    />
                    <div className="ai-suggestion-item__content">
                      <div className="ai-suggestion-item__header">
                        <span className="ai-suggestion-item__label">
                          {suggestion.label}
                        </span>
                        <span
                          className="ai-suggestion-item__confidence"
                          title={`Confidence: ${Math.round(suggestion.confidence * 100)}%`}
                        >
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                      <p className="ai-suggestion-item__reasoning">
                        {suggestion.reasoning}
                      </p>
                    </div>
                  </div>
                ))}
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
            onClick={handleAddSelected}
            disabled={isLoading || selectedIndices.size === 0}
          >
            Add Selected ({selectedIndices.size})
          </button>
        </div>
      </div>
    </div>
  )
}
