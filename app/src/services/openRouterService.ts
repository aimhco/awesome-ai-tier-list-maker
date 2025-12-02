import { getAIConfig } from './aiConfig'
import type { CaptionOptions, ImageData } from '../types/ai'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

interface RequestOptions {
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json_object'
}

export async function makeRequest(
  messages: Message[],
  options?: RequestOptions
): Promise<string> {
  const config = getAIConfig()

  if (!config.apiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Tier List Maker',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
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
    throw new Error(error.error?.message || `API request failed: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * Caption an image using vision model
 */
export async function captionImage(
  imageData: ImageData,
  options?: CaptionOptions
): Promise<string> {
  const { base64, mimeType } = imageData
  const { isScreenshot = false, maxWords = 4 } = options || {}

  const prompt = isScreenshot
    ? `This is a screenshot. Identify the specific application, website, or content shown. Be very specific (e.g., "VS Code Editor", "GitHub Repository Page"). Respond in ${maxWords} words or less.`
    : `Describe this image in ${maxWords} words or less for a tier list item. Be specific and concise about the main subject.`

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

  const result = await makeRequest(messages, { temperature: 0.5 })
  return result.trim().replace(/^["']|["']$/g, '')
}

/**
 * Extract text from image (OCR)
 */
export async function extractTextFromImage(imageData: ImageData): Promise<string[]> {
  const { base64, mimeType } = imageData

  const prompt = `Extract ALL text from this image. Return as a JSON array of strings, one per line of text found. Example: ["Item 1", "Item 2", "Item 3"]. Return ONLY the JSON array, no markdown or explanation.`

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
    temperature: 0.3,
    responseFormat: 'json_object'
  })

  try {
    const parsed = JSON.parse(result)
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
