/**
 * Strip markdown code blocks from AI responses before parsing JSON
 */
export function stripMarkdownCodeBlocks(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g
  const matches = text.match(codeBlockRegex)

  if (matches && matches.length > 0) {
    // Extract content from first code block
    return matches[0].replace(/```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  return text.trim()
}

/**
 * Try to extract JSON from a string that may have extra text
 */
function extractJsonFromText(text: string): string {
  // Find the first { or [ and last } or ]
  const firstBrace = text.indexOf('{')
  const firstBracket = text.indexOf('[')

  let start = -1
  if (firstBrace === -1) start = firstBracket
  else if (firstBracket === -1) start = firstBrace
  else start = Math.min(firstBrace, firstBracket)

  if (start === -1) return text

  const isArray = text[start] === '['
  const lastBrace = text.lastIndexOf(isArray ? ']' : '}')

  if (lastBrace === -1) return text

  return text.slice(start, lastBrace + 1)
}

/**
 * Try to repair truncated JSON by adding missing closing brackets/braces
 */
function repairTruncatedJson(text: string): string {
  let repaired = text.trim()

  // Count opening and closing brackets/braces
  const openBraces = (repaired.match(/{/g) || []).length
  const closeBraces = (repaired.match(/}/g) || []).length
  const openBrackets = (repaired.match(/\[/g) || []).length
  const closeBrackets = (repaired.match(/]/g) || []).length

  // Add missing closing brackets
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    repaired += ']'
  }

  // Add missing closing braces
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}'
  }

  // Remove trailing commas before closing brackets/braces
  repaired = repaired.replace(/,\s*([}\]])/g, '$1')

  return repaired
}

/**
 * Safe JSON parse that handles markdown code blocks and truncated JSON
 */
export function safeJsonParse<T = any>(text: string): T {
  let cleaned = stripMarkdownCodeBlocks(text)

  // Try direct parse first
  try {
    return JSON.parse(cleaned)
  } catch {
    // Try extracting JSON from text
    cleaned = extractJsonFromText(cleaned)

    try {
      return JSON.parse(cleaned)
    } catch {
      // Try repairing truncated JSON
      const repaired = repairTruncatedJson(cleaned)

      try {
        return JSON.parse(repaired)
      } catch (finalError) {
        // Log the original text for debugging
        console.error('Failed to parse JSON after repair attempts:', { original: text, cleaned, repaired })
        throw finalError
      }
    }
  }
}
