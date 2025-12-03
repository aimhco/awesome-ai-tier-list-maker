import { makeRequest } from './openRouterService'
import type { AIItemSuggestion } from '../types/ai'

interface GenerateSuggestionsOptions {
  title: string
  existingItems: string[]
  count?: number
}

/**
 * Generate smart item suggestions based on tier list context
 */
export async function generateItemSuggestions(
  options: GenerateSuggestionsOptions
): Promise<AIItemSuggestion[]> {
  const { title, existingItems, count = 5 } = options

  const existingItemsList = existingItems.length > 0
    ? `\n\nExisting items:\n${existingItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
    : ''

  const prompt = `You are helping create a tier list titled "${title}".${existingItemsList}

Suggest ${count} relevant items that would fit this tier list. Each suggestion should:
- Be specific and concrete (not generic categories)
- Fit the theme/category of this tier list
- Be different from existing items
- Be commonly known or recognizable

Respond with ONLY a JSON object with a "suggestions" array:
{
  "suggestions": [
    {
      "label": "Item name",
      "reasoning": "Brief explanation why this fits",
      "confidence": 0.95
    }
  ]
}

The confidence should be 0-1, where 1 means you're very confident this fits the tier list theme.`

  try {
    const response = await makeRequest(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.7,
        maxTokens: 1000,
        responseFormat: 'json_object',
      }
    )

    const parsed = JSON.parse(response)
    const suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || []

    return suggestions
      .filter((s: any) => s.label && s.reasoning && typeof s.confidence === 'number')
      .map((s: any) => ({
        label: s.label,
        reasoning: s.reasoning,
        confidence: Math.max(0, Math.min(1, s.confidence)),
      }))
      .slice(0, count)
  } catch (error) {
    console.error('Failed to generate suggestions:', error)
    if (error instanceof Error) {
      throw new Error(`AI Suggestions Error: ${error.message}`)
    }
    throw new Error('Failed to generate item suggestions. Please check console for details.')
  }
}
