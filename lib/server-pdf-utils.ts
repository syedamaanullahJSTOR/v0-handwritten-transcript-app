"use server"

/**
 * Server-side function to get PDF page count
 * This is a simplified implementation that looks for the /Count pattern in the PDF
 * In a production environment, you would use a more robust PDF parsing library
 */
export async function getServerPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    // Convert buffer to string
    const pdfString = buffer.toString("binary")

    // Look for /Count pattern in the PDF
    // This is a simplified approach and may not work for all PDFs
    const countMatches = pdfString.match(/\/Count\s+(\d+)/g)

    if (countMatches && countMatches.length > 0) {
      // Extract the highest count value
      const counts = countMatches.map((match) => {
        const numberMatch = match.match(/\/Count\s+(\d+)/)
        return numberMatch ? Number.parseInt(numberMatch[1], 10) : 0
      })

      return Math.max(...counts)
    }

    // Fallback: try to count /Page objects
    const pageMatches = pdfString.match(/\/Page\s*\//g)
    if (pageMatches) {
      return pageMatches.length
    }

    // Default to 1 if we couldn't determine the page count
    return 1
  } catch (error) {
    console.error("Error getting server PDF page count:", error)
    return 1
  }
}
