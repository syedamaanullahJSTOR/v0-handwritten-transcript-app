"use client"

/**
 * A simplified fallback approach for getting PDF page count
 * This doesn't use PDF.js and is more reliable in Next.js environments
 * @param document The document object containing metadata
 * @returns The estimated page count
 */
export function getEstimatedPageCount(document: {
  actualPages?: number
  pages?: number
  transcript?: string
  contentType?: string
}): number {
  // Use actual pages if available
  if (document.actualPages && document.actualPages > 0) {
    return document.actualPages
  }

  // Use pages from transcript markers if available
  if (document.pages && document.pages > 0) {
    return document.pages
  }

  // Try to extract page count from transcript
  if (document.transcript) {
    const pageMatches = document.transcript.match(/Page \d+/g)
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length
    }
  }

  // Default to 1 page
  return 1
}
