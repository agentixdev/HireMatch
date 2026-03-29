/**
 * Shared utility for cleaning and parsing JSON responses from LLMs.
 * Handles markdown fences, comments, and trailing commas that Gemini sometimes returns.
 */

/** Strip markdown fences, single-line comments, and trailing commas from raw LLM output. */
export function cleanJson(raw: string): string {
  return raw
    .replace(/```json\s*/g, '').replace(/```\s*/g, '')   // strip markdown fences
    .replace(/\/\/[^\n]*/g, '')                            // strip single-line comments
    .replace(/,\s*([}\]])/g, '$1');                        // strip trailing commas
}

/**
 * Parse a JSON response from an LLM. Tries direct parse first,
 * then falls back to extracting the first JSON object or array from the text.
 * Throws with a descriptive message on failure.
 */
export function parseLLMJson<T = unknown>(text: string): T {
  const cleaned = cleanJson(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (!match) {
      console.error('No JSON found in LLM response:', text.slice(0, 500));
      throw new Error('LLM returned no valid JSON');
    }
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      console.error('Failed to parse extracted JSON:', match[0].slice(0, 500));
      throw new Error('LLM returned malformed JSON');
    }
  }
}
