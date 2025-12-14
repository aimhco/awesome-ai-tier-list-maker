import { makeRequest } from './openRouterService'
import { safeJsonParse } from '../utils/jsonParser'

export type CommandAction =
  | 'move_items'
  | 'create_tier'
  | 'delete_tier'
  | 'rename_tier'
  | 'clear_tier'
  | 'swap_tiers'
  | 'reorder_tier'
  | 'unknown'

export interface ParsedCommand {
  action: CommandAction
  confidence: number
  params: {
    // For move_items
    itemNames?: string[]
    targetTier?: string
    allItems?: boolean

    // For create_tier
    tierName?: string
    tierPosition?: 'top' | 'bottom' | number

    // For delete_tier
    tierToDelete?: string

    // For rename_tier
    oldTierName?: string
    newTierName?: string

    // For clear_tier
    tierToClear?: string

    // For swap_tiers
    tier1?: string
    tier2?: string

    // For reorder_tier
    tierToMove?: string
    position?: 'top' | 'bottom' | 'above' | 'below'
    relativeTo?: string
  }
  explanation?: string
  error?: string
}

interface ParseCommandContext {
  currentTiers: Array<{ label: string; id: string }>
  currentItems: Array<{ label: string; id: string }>
}

/**
 * Parse natural language command and return structured command object
 */
export async function parseNaturalLanguageCommand(
  userCommand: string,
  context: ParseCommandContext
): Promise<ParsedCommand> {
  if (!userCommand || userCommand.trim().length === 0) {
    return {
      action: 'unknown',
      confidence: 0,
      params: {},
      error: 'Command cannot be empty',
    }
  }

  const tiersList = context.currentTiers.map(t => t.label).join(', ')
  const itemsList = context.currentItems.slice(0, 20).map(i => i.label).join(', ')
  const itemsPreview = context.currentItems.length > 20
    ? `${itemsList}... (${context.currentItems.length} total items)`
    : itemsList

  const prompt = `You are a command parser for a tier list maker app. Parse the user's natural language command into a structured JSON format.

Current tiers (in order from top to bottom): ${tiersList}
Current items: ${itemsPreview}

User command: "${userCommand}"

Available actions and their EXACT parameter names:

1. move_items - Move specific items or all items to a tier
   params: { "itemNames": ["item1", "item2"], "targetTier": "S", "allItems": false }

2. create_tier - Create a new tier
   params: { "tierName": "New Tier", "tierPosition": "top" or "bottom" or number }

3. delete_tier - Delete an existing tier
   params: { "tierToDelete": "Tier Name" }

4. rename_tier - Rename a tier
   params: { "oldTierName": "S", "newTierName": "Superhuman" }

5. clear_tier - Remove all items from a tier
   params: { "tierToClear": "Tier Name" }

6. swap_tiers - Swap positions of two tiers
   params: { "tier1": "S", "tier2": "A" }

7. reorder_tier - Move a tier to a different position
   params: { "tierToMove": "Tier Name", "position": "top" or "bottom" }

8. unknown - Command not understood

Example response:
{
  "action": "rename_tier",
  "confidence": 0.95,
  "params": {
    "oldTierName": "S",
    "newTierName": "Superhuman"
  },
  "explanation": "Rename tier S to Superhuman"
}

Important rules:
- Use EXACTLY the parameter names shown above (oldTierName, newTierName, NOT oldTier, newName)
- Tier names should match existing tiers EXACTLY (case-sensitive)
- Item names should match existing items as closely as possible
- Set confidence 0-1 based on how clear the command is
- If the command is ambiguous or unclear, set action to "unknown" and explain why in "error"
- Respond ONLY with the JSON object, no markdown or extra text`

  try {
    const response = await makeRequest(
      [{ role: 'user', content: prompt }],
      {
        temperature: 0.3,
        maxTokens: 500,
        responseFormat: 'json_object',
      }
    )

    const parsed = safeJsonParse(response)

    // Validate response structure
    if (!parsed.action || typeof parsed.confidence !== 'number') {
      return {
        action: 'unknown',
        confidence: 0,
        params: {},
        error: 'Invalid response from AI parser',
      }
    }

    return {
      action: parsed.action as CommandAction,
      confidence: parsed.confidence,
      params: parsed.params || {},
      explanation: parsed.explanation,
      error: parsed.error,
    }
  } catch (error) {
    console.error('Failed to parse natural language command:', error)
    return {
      action: 'unknown',
      confidence: 0,
      params: {},
      error: error instanceof Error ? error.message : 'Failed to parse command',
    }
  }
}
