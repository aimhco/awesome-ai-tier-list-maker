import { makeRequest } from './openRouterService'
import { safeJsonParse } from '../utils/jsonParser'

interface TierSuggestion {
  label: string
  color: string
  textColor: string
}

interface ItemSuggestion {
  label: string
}

export interface TierListSetup {
  title: string
  tiers: TierSuggestion[]
  items: ItemSuggestion[]
}

interface GenerateSetupOptions {
  topic: string
  numTiers?: number
  numItems?: number
}

/**
 * Generate AI-powered tier list setup based on topic
 */
export async function generateTierListSetup(
  options: GenerateSetupOptions
): Promise<TierListSetup> {
  const { topic, numTiers = 5, numItems = 12 } = options

  if (!topic || topic.trim().length === 0) {
    throw new Error('Topic cannot be empty')
  }

  const prompt = `You are helping create a tier list about: "${topic}"

Please generate a complete tier list setup with:
1. An engaging title (max 60 characters)
2. ${numTiers} tier labels (from best to worst)
3. ${numItems} relevant items to rank

Guidelines:
- Tier labels should be appropriate for the topic (e.g., for games: S, A, B, C, D; for food: Amazing, Great, Good, Okay, Bad)
- Choose colors that create a nice visual gradient from best (warm/bright) to worst (cool/dark)
- Items should be well-known, popular, or relevant examples for this topic
- Text color should be either "#FFFFFF" (white) or "#000000" (black) based on background color for readability

Respond with ONLY a JSON object:
{
  "title": "Engaging Title Here",
  "tiers": [
    {
      "label": "S",
      "color": "#ff4757",
      "textColor": "#FFFFFF"
    }
  ],
  "items": [
    {
      "label": "Item Name"
    }
  ]
}

Make it creative and tailored to "${topic}"!`

  try {
    const response = await makeRequest(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.8,
        maxTokens: 2000,
        responseFormat: 'json_object',
      }
    )

    const parsed = safeJsonParse(response)

    // Validate response structure
    if (!parsed.title || !Array.isArray(parsed.tiers) || !Array.isArray(parsed.items)) {
      throw new Error('Invalid response format from AI')
    }

    // Validate tiers
    const tiers = parsed.tiers
      .filter((t: any) => t.label && t.color && t.textColor)
      .map((t: any) => ({
        label: String(t.label).slice(0, 20),
        color: String(t.color),
        textColor: String(t.textColor),
      }))

    if (tiers.length === 0) {
      throw new Error('No valid tiers generated')
    }

    // Validate items
    const items = parsed.items
      .filter((i: any) => i.label)
      .map((i: any) => ({
        label: String(i.label).slice(0, 50),
      }))

    if (items.length === 0) {
      throw new Error('No valid items generated')
    }

    return {
      title: String(parsed.title).slice(0, 60),
      tiers,
      items,
    }
  } catch (error) {
    console.error('Failed to generate tier list setup:', error)
    if (error instanceof Error) {
      throw new Error(`AI Setup Error: ${error.message}`)
    }
    throw new Error('Failed to generate tier list setup. Please try again.')
  }
}
