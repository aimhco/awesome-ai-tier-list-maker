import { useState } from 'react'
import type { TierListSetup } from '../services/aiTierListSetup'

interface AISetupWizardProps {
  isLoading: boolean
  error: string | null
  setup: TierListSetup | null
  onGenerate: (topic: string) => void
  onApply: () => void
  onCancel: () => void
  onRetry: () => void
}

export function AISetupWizard({
  isLoading,
  error,
  setup,
  onGenerate,
  onApply,
  onCancel,
  onRetry,
}: AISetupWizardProps) {
  const [topic, setTopic] = useState('')

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (topic.trim()) {
      onGenerate(topic.trim())
    }
  }

  return (
    <div className="settings-modal__backdrop" data-hide-in-screenshot="true">
      <div className="settings-modal ai-setup-wizard">
        <div className="settings-modal__title">
          <h2>Tier List Setup Wizard</h2>
          <button
            className="item-card__remove settings-modal__close"
            onClick={onCancel}
            aria-label="Close setup wizard"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="ai-setup-wizard__content">
          {/* Step 1: Topic Input */}
          {!setup && !isLoading && (
            <form onSubmit={handleGenerate} className="ai-setup-wizard__form">
              <p className="ai-setup-wizard__description">
                Let AI help you create a tier list! Just tell us what you want to rank.
              </p>

              <div className="ai-setup-wizard__input-group">
                <label htmlFor="setup-topic" className="ai-setup-wizard__label">
                  What do you want to rank?
                </label>
                <input
                  id="setup-topic"
                  type="text"
                  className="ai-setup-wizard__input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Programming Languages, Fast Food Chains, Marvel Movies..."
                  maxLength={100}
                  autoFocus
                  disabled={isLoading}
                  autoComplete="off"
                />
                <p className="ai-setup-wizard__hint">
                  Examples: Video Games, Pizza Toppings, Dog Breeds, Programming Languages
                </p>
              </div>

              <button
                type="submit"
                className="button button--primary"
                disabled={!topic.trim() || isLoading}
              >
                Generate Tier List ✨
              </button>
            </form>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="ai-setup-wizard__loading">
              <p>Creating your tier list...</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                This may take 10-15 seconds
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="ai-setup-wizard__error">
              <p>{error}</p>
              <button
                type="button"
                className="button button--secondary"
                onClick={onRetry}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Step 2: Preview & Apply */}
          {setup && !isLoading && !error && (
            <div className="ai-setup-wizard__preview">
              <div className="ai-setup-wizard__preview-header">
                <h3>Preview Your Tier List</h3>
                <p>Review the AI-generated setup. You can customize it later!</p>
              </div>

              <div className="ai-setup-wizard__preview-section">
                <h4>Title</h4>
                <div className="ai-setup-wizard__title-preview">
                  {setup.title}
                </div>
              </div>

              <div className="ai-setup-wizard__preview-section">
                <h4>Tiers ({setup.tiers.length})</h4>
                <div className="ai-setup-wizard__tiers-preview">
                  {setup.tiers.map((tier, index) => (
                    <div
                      key={index}
                      className="ai-setup-wizard__tier-preview"
                      style={{ backgroundColor: tier.color, color: tier.textColor }}
                    >
                      {tier.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="ai-setup-wizard__preview-section">
                <h4>Items ({setup.items.length})</h4>
                <div className="ai-setup-wizard__items-preview">
                  {setup.items.slice(0, 12).map((item, index) => (
                    <div key={index} className="ai-setup-wizard__item-preview">
                      {item.label}
                    </div>
                  ))}
                  {setup.items.length > 12 && (
                    <div className="ai-setup-wizard__item-preview ai-setup-wizard__item-preview--more">
                      +{setup.items.length - 12} more
                    </div>
                  )}
                </div>
              </div>

              <div className="ai-setup-wizard__preview-actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => {
                    setTopic('')
                    onRetry()
                  }}
                >
                  Start Over
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={onApply}
                >
                  Apply & Start Ranking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
