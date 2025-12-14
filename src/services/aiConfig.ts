import type { AIConfig } from '../types/ai'

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const AI_MODE = import.meta.env.VITE_AI_MODE || 'user'
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'amazon/nova-2-lite-v1:free,google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free'

const FREE_MODELS = [
  'amazon/nova-2-lite-v1:free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free'
]

// Vision models for OCR/image analysis
// Free models - testing with full resolution images
export const VISION_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'amazon/nova-2-lite-v1:free'
]

export function getAIConfig(): AIConfig {
  const isPublicMode = AI_MODE === 'public'

  // Parse comma-separated models for fallback support
  const models = AI_MODEL.split(',').map(m => m.trim()).filter(Boolean)
  const primaryModel = models[0] || 'amazon/nova-2-lite-v1:free'

  return {
    mode: isPublicMode ? 'public' : 'user',
    apiKey: API_KEY || '',
    model: primaryModel,
    models: models, // Array of models for fallback
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
  return config.freeModelsOnly ? 'amazon/nova-2-lite-v1:free' : config.model
}

export function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    'amazon/nova-2-lite-v1:free': 'Nova 2 Lite',
    'google/gemini-2.0-flash-exp:free': 'Gemini 2.0 Flash',
    'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 70B',
  }
  return displayNames[model] || model.split('/')[1]?.split(':')[0] || model
}
