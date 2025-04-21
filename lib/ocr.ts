"use server"

import type { TextMapItem } from "./types"

export async function generateTranscript(file: File): Promise<{ transcript: string; textMap: TextMapItem[] }> {
  try {
    // Hardcoded transcript text as requested
    const hardcodedTranscript = `Page 1

George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.

Page 2

George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.

Page 3

George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.

Page 4

George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.`

    // Generate a text map for highlighting with page numbers
    const textMap = generateTextMapWithPages(hardcodedTranscript)

    return {
      transcript: hardcodedTranscript,
      textMap,
    }
  } catch (error) {
    console.error("Error generating transcript:", error)
    throw new Error(`Failed to generate transcript: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Generate text map with page numbers
function generateTextMapWithPages(text: string): TextMapItem[] {
  const textMap: TextMapItem[] = []

  // Split the text by "Page" markers
  const pages = text.split(/Page \d+/).filter((page) => page.trim().length > 0)

  // Process each page
  pages.forEach((pageContent, pageIndex) => {
    const pageNumber = pageIndex + 1
    const lines = pageContent.trim().split("\n")

    let y = 10 // Starting y position

    // Process each line
    lines.forEach((line) => {
      const words = line.split(/\s+/).filter((word) => word.trim().length > 0)
      let x = 5 // Starting x position for each line

      // Process each word in the line
      words.forEach((word) => {
        // Create a bounding box for the word
        const width = 5 + word.length * 2

        textMap.push({
          text: word,
          bbox: {
            x,
            y,
            width,
            height: 4,
          },
          page: pageNumber,
        })

        x += width + 2 // Move x position for next word
      })

      y += 8 // Move y position for next line
    })
  })

  return textMap
}

// Original function kept for reference but not used
function _generateTextMap(text: string): TextMapItem[] {
  const words = text.split(/\s+/)
  const textMap: TextMapItem[] = []

  let y = 10
  let x = 5

  for (const word of words) {
    if (word.trim() === "") continue

    // Create a bounding box
    const width = 5 + word.length * 2

    if (x + width > 90) {
      x = 5
      y += 5
    }

    textMap.push({
      text: word,
      bbox: {
        x,
        y,
        width,
        height: 4,
      },
    })

    x += width + 2
  }

  return textMap
}
