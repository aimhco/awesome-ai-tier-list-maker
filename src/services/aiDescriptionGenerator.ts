import { makeRequest } from './openRouterService'
import type { AIDescriptionOptions } from '../types/ai'

interface TierInfo {
  id: string
  label: string
  color: string
}

interface ItemInfo {
  id: string
  label: string
}

interface TierWithItems {
  tier: TierInfo
  items: ItemInfo[]
}

interface GenerateDescriptionInput {
  title: string
  tiersWithItems: TierWithItems[]
  options: AIDescriptionOptions
}

/**
 * Generate AI-powered tier list description
 */
export async function generateTierListDescription(
  input: GenerateDescriptionInput
): Promise<string> {
  const { title, tiersWithItems, options } = input

  // Filter out empty tiers
  const nonEmptyTiers = tiersWithItems.filter(t => t.items.length > 0)

  if (nonEmptyTiers.length === 0) {
    throw new Error('No items have been placed in tiers yet. Place some items first!')
  }

  const styleInstructions = {
    casual: 'Write in a friendly, conversational tone like you\'re explaining to a friend.',
    formal: 'Write in a professional, objective tone suitable for a report or article.',
    funny: 'Write with humor, wit, and entertaining commentary. Make it fun to read!',
    technical: 'Write in a detailed, analytical tone with specific observations about patterns and trends.',
  }

  const tiersDescription = nonEmptyTiers
    .map((t) => {
      const itemsList = t.items.map(item => `  - ${item.label}`).join('\n')
      return `${t.tier.label}:\n${itemsList}`
    })
    .join('\n\n')

  const prompt = `You are helping create a shareable description for a tier list titled "${title}".

Here are the tiers and their items (from best to worst):

${tiersDescription}

Your task:
1. Write a ${options.style} description of this tier list
2. ${options.includeReasoning ? 'Include reasoning and commentary about the placements' : 'Keep it concise without detailed reasoning'}
3. ${styleInstructions[options.style]}
4. Structure: Start with a brief intro, then describe each tier, finish with a conclusion
5. Make it engaging and informative

Write the description as plain text. Do NOT use markdown formatting. Keep paragraphs separated with double line breaks.`

  try {
    const response = await makeRequest(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.8,
        maxTokens: 1500,
      }
    )

    return response.trim()
  } catch (error) {
    console.error('Failed to generate tier list description:', error)
    if (error instanceof Error) {
      throw new Error(`AI Description Error: ${error.message}`)
    }
    throw new Error('Failed to generate description. Please check console for details.')
  }
}
