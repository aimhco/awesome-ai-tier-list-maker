import { useState } from 'react'
import type { ParsedCommand } from '../services/aiNaturalCommands'

interface NaturalCommandModalProps {
  isLoading: boolean
  parsedCommand: ParsedCommand | null
  onSubmit: (command: string) => void
  onExecute: () => void
  onCancel: () => void
  onClear: () => void
}

export function NaturalCommandModal({
  isLoading,
  parsedCommand,
  onSubmit,
  onExecute,
  onCancel,
  onClear,
}: NaturalCommandModalProps) {
  const [command, setCommand] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim() && !isLoading) {
      onSubmit(command.trim())
    }
  }

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      move_items: 'Move Items',
      create_tier: 'Create Tier',
      delete_tier: 'Delete Tier',
      rename_tier: 'Rename Tier',
      clear_tier: 'Clear Tier',
      swap_tiers: 'Swap Tiers',
      reorder_tier: 'Reorder Tier',
      unknown: 'Unknown Command',
    }
    return labels[action] || action
  }

  const canExecute = parsedCommand &&
    parsedCommand.action !== 'unknown' &&
    parsedCommand.confidence > 0.5 &&
    !parsedCommand.error

  return (
    <div className="settings-modal__backdrop" data-hide-in-screenshot="true">
      <div className="settings-modal natural-command-modal">
        <div className="settings-modal__title">
          <h2>Natural Language Commands</h2>
          <button
            className="item-card__remove settings-modal__close"
            onClick={onCancel}
            aria-label="Close command modal"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="natural-command-modal__content">
          <p className="natural-command-modal__description">
            Tell the AI what you want to do with your tier list in plain English. Only single commands are supported at a time.
          </p>

          <form onSubmit={handleSubmit} className="natural-command-modal__form">
            <div className="natural-command-modal__input-group">
              <label htmlFor="command-input" className="natural-command-modal__label">
                What would you like to do?
              </label>
              <input
                id="command-input"
                type="text"
                className="natural-command-modal__input"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder='e.g., "Move Python to S tier" or "Create a new tier called God Tier"'
                disabled={isLoading}
                autoFocus
                autoComplete="off"
              />
              <div className="natural-command-modal__examples">
                <strong>Examples:</strong>
                <ul>
                  <li>"Move Python and JavaScript to S tier"</li>
                  <li>"Create a new tier called God Tier at the top"</li>
                  <li>"Rename A tier to Amazing"</li>
                  <li>"Clear all items from D tier"</li>
                  <li>"Swap S and A tiers"</li>
                </ul>
              </div>
            </div>

            <button
              type="submit"
              className="button button--primary"
              disabled={!command.trim() || isLoading}
            >
              {isLoading ? 'Parsing...' : 'Parse Command'}
            </button>
          </form>

          {/* Parsed Command Preview */}
          {parsedCommand && (
            <div className={`natural-command-modal__preview ${parsedCommand.error ? 'natural-command-modal__preview--error' : ''}`}>
              <div className="natural-command-modal__preview-header">
                <h3>Parsed Command</h3>
                <span className={`natural-command-modal__confidence ${parsedCommand.confidence > 0.7 ? 'high' : parsedCommand.confidence > 0.4 ? 'medium' : 'low'}`}>
                  Confidence: {Math.round(parsedCommand.confidence * 100)}%
                </span>
              </div>

              <div className="natural-command-modal__preview-body">
                <div className="natural-command-modal__preview-field">
                  <strong>Action:</strong> {getActionLabel(parsedCommand.action)}
                </div>

                {parsedCommand.explanation && (
                  <div className="natural-command-modal__preview-field">
                    <strong>Interpretation:</strong> {parsedCommand.explanation}
                  </div>
                )}

                {parsedCommand.error && (
                  <div className="natural-command-modal__error">
                    <strong>Error:</strong> {parsedCommand.error}
                  </div>
                )}

                {parsedCommand.params && Object.keys(parsedCommand.params).length > 0 && (
                  <div className="natural-command-modal__preview-field">
                    <strong>Parameters:</strong>
                    <pre className="natural-command-modal__params">
                      {JSON.stringify(parsedCommand.params, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="natural-command-modal__preview-actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={onClear}
                >
                  Try Another
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={onExecute}
                  disabled={!canExecute}
                >
                  Execute Command
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
