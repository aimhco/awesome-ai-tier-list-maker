import { getAIConfig, VISION_MODELS } from './aiConfig'
import type { ImageData } from '../types/ai'
import { safeJsonParse } from '../utils/jsonParser'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Track the last successful model
let lastSuccessfulModel: string | null = null

export function getActiveModel(): string | null {
  return lastSuccessfulModel
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

interface RequestOptions {
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json_object'
  useVisionModels?: boolean
}

export async function makeRequest(
  messages: Message[],
  options?: RequestOptions
): Promise<string> {
  const config = getAIConfig()

  if (!config.apiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  // Get models to try (with fallback support)
  // Use vision models for image tasks
  const modelsToTry = options?.useVisionModels
    ? VISION_MODELS
    : (config.models && config.models.length > 0 ? config.models : [config.model])

  let lastError: Error | null = null

  // Try each model in sequence
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i]

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Tier List Maker',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1000,
          ...(options?.responseFormat === 'json_object' && {
            response_format: { type: 'json_object' }
          })
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const errorMessage = error.error?.message || `API request failed: ${response.status}`

        // If this is a model availability error and we have more models to try, continue
        if ((errorMessage.includes('No endpoints found') || response.status === 404) && i < modelsToTry.length - 1) {
          console.warn(`Model ${model} not available, trying next model...`)
          lastError = new Error(errorMessage)
          continue
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''

      // Track the successful model
      lastSuccessfulModel = model

      // Log which model was successful if we tried fallbacks
      if (i > 0) {
        console.log(`Successfully used fallback model: ${model}`)
      }

      return content
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      // If we have more models to try, continue
      if (i < modelsToTry.length - 1) {
        console.warn(`Model ${model} failed, trying next model...`)
        continue
      }

      // This was the last model, throw the error
      throw lastError
    }
  }

  // If we somehow get here, throw the last error
  throw lastError || new Error('All models failed')
}

/**
 * Extract text from image (OCR) using AI vision model
 */
export async function extractTextFromImage(imageData: ImageData): Promise<string[]> {
  const { base64, mimeType } = imageData

  const prompt = `Look at this image and list all the text/words you can see.

The image contains names, labels, or words that I need to extract. Please read each word carefully and return them in a JSON format.

Return a JSON object like this:
{"texts": ["word1", "word2", "word3"]}

List every readable word or name you see in the image.`

  const messages: Message[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64}`
          }
        }
      ]
    }
  ]

  const result = await makeRequest(messages, {
    temperature: 0.2,
    useVisionModels: true
  })

  try {
    const parsed = safeJsonParse(result)
    return Array.isArray(parsed) ? parsed : parsed.texts || []
  } catch {
    return []
  }
}

/**
 * Detect if image dimensions suggest a screenshot
 */
export function detectScreenshot(width: number, height: number): boolean {
  if (!width || !height) return false

  const aspectRatio = width / height

  // Common monitor aspect ratios
  const commonRatios = [
    16 / 9,   // Most common
    16 / 10,  // Common
    21 / 9,   // Ultrawide
    4 / 3,    // Traditional
    3 / 2     // Surface/iPad
  ]

  const matchesRatio = commonRatios.some(ratio =>
    Math.abs(aspectRatio - ratio) < 0.05
  )

  const isLargeImage = width >= 1024 || height >= 768

  return matchesRatio && isLargeImage
}
