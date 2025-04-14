/**
 * Formats and cleans up transcript text to improve readability
 */
export function formatTranscript(text: string): string {
  if (!text || !text.trim()) {
    return ""
  }

  // Step 1: Normalize whitespace
  let formatted = text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\t/g, "    ") // Replace tabs with spaces
    .replace(/[ ]{3,}/g, "  ") // Reduce multiple spaces to double spaces
    .replace(/\n{3,}/g, "\n\n") // Reduce multiple line breaks to double line breaks

  // Step 2: Fix common OCR issues
  formatted = formatted
    .replace(/([a-z])\.([A-Z])/g, "$1. $2") // Add space after period between sentences
    .replace(/([a-z]),([a-z])/g, "$1, $2") // Add space after comma if missing
    .replace(/([a-z]):([a-z])/g, "$1: $2") // Add space after colon if missing

  // Step 3: Improve paragraph detection
  // Look for sentences that end with period, question mark, or exclamation mark
  // followed by a single newline, and replace with double newline for paragraph break
  formatted = formatted.replace(/([.!?])\n(?=[A-Z])/g, "$1\n\n")

  // Step 4: Clean up extra spaces at the beginning and end of lines
  formatted = formatted
    .split("\n")
    .map((line) => line.trim())
    .join("\n")

  // Step 5: Final cleanup
  formatted = formatted.trim()

  return formatted
}
