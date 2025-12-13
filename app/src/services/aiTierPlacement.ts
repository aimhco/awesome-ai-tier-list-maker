import { makeRequest } from './openRouterService'
import type { AITierPlacement } from '../types/ai'
import { safeJsonParse } from '../utils/jsonParser'

interface TierInfo {
  id: string
  label: string
}

interface ItemInfo {
  id: string
  label: string
}

interface GeneratePlacementsOptions {
  title: string
  tiers: TierInfo[]
  items: ItemInfo[]
}

/**
 * Generate AI-powered tier placement suggestions for items
 */
export async function generateTierPlacements(
  options: GeneratePlacementsOptions
): Promise<AITierPlacement[]> {
  const { title, tiers, items } = options

  if (items.length === 0) {
    return []
  }

  const tiersList = tiers.map((t, i) => `${i + 1}. ${t.label} (id: "${t.id}")`).join('\n')
  const itemsList = items.map((item, i) => `${i + 1}. ${item.label} (id: "${item.id}")`).join('\n')

  const prompt = `You are helping rank items for a tier list titled "${title}".

Tiers (from best to worst):
${tiersList}

Items to rank:
${itemsList}

For each item, suggest which tier it belongs in based on quality, popularity, or relevance to the tier list theme. Provide reasoning for each placement.

Respond with ONLY a JSON object with a "placements" array:
{
  "placements": [
    {
      "itemId": "item-id-here",
      "tier": "tier-id-here",
      "reasoning": "Brief explanation why this item belongs in this tier",
      "confidence": 0.85
    }
  ]
}

The confidence should be 0-1, where 1 means you're very confident about the placement.`

  try {
    const response = await makeRequest(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.7,
        maxTokens: 2000,
        responseFormat: 'json_object',
      }
    )

    const parsed = safeJsonParse(response)
    const placements = parsed.placements || []

    return placements
      .filter((p: any) =>
        p.itemId &&
        p.tier &&
        p.reasoning &&
        typeof p.confidence === 'number'
      )
      .map((p: any) => ({
        itemId: p.itemId,
        tier: p.tier,
        reasoning: p.reasoning,
        confidence: Math.max(0, Math.min(1, p.confidence)),
      }))
  } catch (error) {
    console.error('Failed to generate tier placements:', error)
    if (error instanceof Error) {
      throw new Error(`AI Tier Placement Error: ${error.message}`)
    }
    throw new Error('Failed to generate tier placements. Please check console for details.')
  }
}
