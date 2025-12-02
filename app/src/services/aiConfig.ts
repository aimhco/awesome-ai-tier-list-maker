import type { AIConfig } from '../types/ai'

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const AI_MODE = import.meta.env.VITE_AI_MODE || 'user'
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'x-ai/grok-4.1-fast:free'

const FREE_MODELS = [
  'x-ai/grok-4.1-fast:free',
  'x-ai/grok-4-fast:free',
  'google/gemini-flash-1.5:free'
]

export function getAIConfig(): AIConfig {
  const isPublicMode = AI_MODE === 'public'

  return {
    mode: isPublicMode ? 'public' : 'user',
    apiKey: API_KEY || '',
    model: AI_MODEL,
    freeModelsOnly: isPublicMode
  }
}

export function isAIAvailable(): boolean {
  const config = getAIConfig()
  return Boolean(config.apiKey)
}

export function validateModel(model: string, config: AIConfig): boolean {
  if (config.freeModelsOnly) {
    return FREE_MODELS.includes(model)
  }
  return true
}

export function getDefaultModel(config: AIConfig): string {
  return config.freeModelsOnly ? 'x-ai/grok-4.1-fast:free' : config.model
}
