import { useState, useRef } from 'react'
import type { AIDescriptionOptions } from '../types/ai'

interface AIDescriptionModalProps {
  description: string
  isLoading: boolean
  error: string | null
  onGenerate: (options: AIDescriptionOptions) => void
  onClose: () => void
  onRetry: () => void
}

export function AIDescriptionModal({
  description,
  isLoading,
  error,
  onGenerate,
  onClose,
  onRetry,
}: AIDescriptionModalProps) {
  const [style, setStyle] = useState<AIDescriptionOptions['style']>('casual')
  const [includeReasoning, setIncludeReasoning] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleGenerate = () => {
    onGenerate({ style, includeReasoning })
  }

  const handleCopy = async () => {
    if (description && textareaRef.current) {
      try {
        await navigator.clipboard.writeText(description)
        // Visual feedback
        const button = document.activeElement as HTMLButtonElement
        if (button) {
          const originalText = button.textContent
          button.textContent = 'Copied!'
          setTimeout(() => {
            button.textContent = originalText
          }, 2000)
        }
      } catch (err) {
        console.error('Failed to copy:', err)
        // Fallback: select text
        textareaRef.current.select()
      }
    }
  }

  const hasDescription = description && !isLoading && !error

  return (
    <div className="settings-modal__backdrop" data-hide-in-screenshot="true">
      <div className="settings-modal ai-description-modal">
        <div className="settings-modal__title">
          <h2>Generate Tier List Description</h2>
          <button
            className="item-card__remove settings-modal__close"
            onClick={onClose}
            aria-label="Close description generator"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="ai-description-modal__content">
          {/* Options Section */}
          <div className="ai-description-modal__options">
            <div className="ai-description-modal__option-group">
              <label htmlFor="description-style" className="ai-description-modal__label">
                Style:
              </label>
              <select
                id="description-style"
                className="ai-description-modal__select"
                value={style}
                onChange={(e) => setStyle(e.target.value as AIDescriptionOptions['style'])}
                disabled={isLoading}
              >
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="funny">Funny</option>
                <option value="technical">Technical</option>
              </select>
            </div>

            <div className="ai-description-modal__option-group">
              <label className="ai-description-modal__checkbox-label">
                <input
                  type="checkbox"
                  checked={includeReasoning}
                  onChange={(e) => setIncludeReasoning(e.target.checked)}
                  disabled={isLoading}
                />
                <span>Include reasoning for placements</span>
              </label>
            </div>

            <button
              type="button"
              className="button button--primary"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {hasDescription ? 'Regenerate' : 'Generate'} Description
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="ai-description-modal__loading">
              <p>Generating description...</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                This may take 10-15 seconds
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="ai-description-modal__error">
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

          {/* Description Display */}
          {hasDescription && (
            <div className="ai-description-modal__result">
              <div className="ai-description-modal__result-header">
                <h3>Generated Description:</h3>
                <button
                  type="button"
                  className="button button--small"
                  onClick={handleCopy}
                >
                  Copy to Clipboard
                </button>
              </div>
              <textarea
                ref={textareaRef}
                className="ai-description-modal__textarea"
                value={description}
                readOnly
                rows={15}
              />
            </div>
          )}
        </div>

        <div className="settings-modal__footer">
          <button
            type="button"
            className="button button--secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
