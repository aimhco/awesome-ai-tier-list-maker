import type { AIConfig } from '../types/ai'

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const AI_MODE = import.meta.env.VITE_AI_MODE || 'user'
// Default to low-cost paid models for reliability (DeepSeek for text, with free fallbacks)
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'deepseek/deepseek-v3.2,xiaomi/mimo-v2-flash:free,mistralai/devstral-2512:free'

// Free models available on OpenRouter (as of Jan 2025)
const FREE_MODELS = [
  'xiaomi/mimo-v2-flash:free',
  'mistralai/devstral-2512:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'allenai/molmo-2-8b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free'
]

// Vision models for OCR/image analysis
// Primary: Gemini 3 Flash (paid, reliable), Fallback: free vision models
export const VISION_MODELS = [
  'google/gemini-3-flash-preview',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'allenai/molmo-2-8b:free'
]

export function getAIConfig(): AIConfig {
  const isPublicMode = AI_MODE === 'public'

  // Parse comma-separated models for fallback support
  const models = AI_MODEL.split(',').map((m: string) => m.trim()).filter(Boolean)
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
  return config.freeModelsOnly ? 'xiaomi/mimo-v2-flash:free' : config.model
}

export function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    // Paid models
    'deepseek/deepseek-v3.2': 'DeepSeek V3.2',
    'google/gemini-3-flash-preview': 'Gemini 3 Flash',
    // Free models
    'xiaomi/mimo-v2-flash:free': 'MiMo V2 Flash',
    'mistralai/devstral-2512:free': 'Devstral',
    'nvidia/nemotron-nano-12b-v2-vl:free': 'Nemotron Nano 12B VL',
    'nvidia/nemotron-3-nano-30b-a3b:free': 'Nemotron 3 Nano 30B',
    'allenai/molmo-2-8b:free': 'Molmo 2 8B',
  }
  return displayNames[model] || model.split('/')[1]?.split(':')[0] || model
}
