// AI Configuration
export interface AIConfig {
  mode: 'user' | 'public'
  apiKey: string
  model: string
  models?: string[] // Optional array of models for fallback
  freeModelsOnly: boolean
}

// Vision & Image
export interface CaptionOptions {
  isScreenshot?: boolean
  maxWords?: number
}

export interface ImageData {
  base64: string
  mimeType: string
}

// Smart Suggestions
export interface AIItemSuggestion {
  label: string
  reasoning: string
  confidence: number
}

// Tier Placement
export interface AITierPlacement {
  itemId: string
  tier: string
  reasoning: string
  confidence: number
}

// Description Generation
export interface AIDescriptionOptions {
  style: 'casual' | 'formal' | 'funny' | 'technical'
  includeReasoning: boolean
}

// Image Search & Fetch
export interface ImageSearchOptions {
  query: string
  brandAware: boolean
  preferSpecific: boolean
}

// Natural Language Commands
export interface NLCommand {
  type: 'rename_tier' | 'change_tier_color' | 'add_item' | 'remove_item' | 'move_item' | 'create_tier_list'
  parameters: Record<string, any>
  confirmationMessage?: string
  successMessage?: string
  requiresConfirmation?: boolean
}

// OCR Results
export interface OCRResult {
  texts: string[]
  confidence: number
}

// Error Handling
export interface AIError {
  message: string
  code: string
  retryable: boolean
}

export type AIStatus = 'idle' | 'loading' | 'success' | 'error'
