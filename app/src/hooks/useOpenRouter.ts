import { useState, useCallback } from 'react'
import { isAIAvailable } from '../services/aiConfig'
import type { AIStatus, AIError } from '../types/ai'

export function useOpenRouter() {
  const [available] = useState(isAIAvailable())
  const [status, setStatus] = useState<AIStatus>('idle')
  const [error, setError] = useState<AIError | null>(null)

  const executeTask = useCallback(async <T,>(
    task: () => Promise<T>
  ): Promise<T | null> => {
    setStatus('loading')
    setError(null)

    try {
      const result = await task()
      setStatus('success')
      return result
    } catch (err) {
      console.error('AI task failed:', err)
      const aiError: AIError = {
        message: err instanceof Error ? err.message : 'Unknown error',
        code: 'TASK_FAILED',
        retryable: true
      }
      setError(aiError)
      setStatus('error')
      return null
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setStatus('idle')
  }, [])

  return { available, status, error, executeTask, clearError }
}
