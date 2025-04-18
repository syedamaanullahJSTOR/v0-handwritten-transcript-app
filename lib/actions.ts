"use server"

import { revalidatePath } from "next/cache"
import { generateTranscript } from "./ocr"
import type { Document } from "./types"

// Use a more persistent approach for the mock database
// In a real app, you would use a database like MongoDB, PostgreSQL, etc.
let documents: Document[] = [
  // Add a sample document with ID "1" to ensure it exists
  {
    id: "1",
    name: "Historical Letter.pdf",
    url: "/antique-letter-close-up.png",
    contentType: "image/png",
    transcript:
      "My dearest Elizabeth,\n\nI hope this letter finds you in good health and spirits. The journey to Boston was arduous, but I have arrived safely and have taken lodgings near the harbor. The city is bustling with activity, and there is much talk of the recent events in Parliament. Many here are concerned about the implications of the new taxes, and there have been several public meetings to discuss our response.\n\nI have met with Mr. Adams and several other gentlemen of like mind. They speak passionately about liberty and the rights of colonists. While I share their concerns, I find myself cautious about some of the more radical proposals being discussed. Nevertheless, these are extraordinary times that call for careful consideration of our position and principles.\n\nPlease give my regards to your father and assure him that I will attend to the business matters we discussed before my departure. I expect to return within a fortnight, assuming the weather permits safe passage.\n\nWith deepest affection,\nJonathan",
    status: "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pages: 2, // Add pages property
    textMap: [
      {
        text: "My",
        bbox: { x: 10, y: 10, width: 8, height: 4 },
      },
      {
        text: "dearest",
        bbox: { x: 23, y: 10, width: 18, height: 4 },
      },
      {
        text: "Elizabeth,",
        bbox: { x: 46, y: 10, width: 22, height: 4 },
      },
      {
        text: "I",
        bbox: { x: 10, y: 15, width: 3, height: 4 },
      },
      {
        text: "hope",
        bbox: { x: 18, y: 15, width: 12, height: 4 },
      },
      {
        text: "this",
        bbox: { x: 35, y: 15, width: 10, height: 4 },
      },
      {
        text: "letter",
        bbox: { x: 50, y: 15, width: 15, height: 4 },
      },
    ],
  },
]

let nextId = 2 // Start from 2 since we already have document with ID "1"

export async function uploadDocument(formData: FormData) {
  try {
    const files = formData.getAll("files") as File[]
    const documentIds: string[] = []

    for (const file of files) {
      const id = String(nextId++)
      const name = file.name
      const contentType = file.type || "application/octet-stream"

      // Default URL (fallback)
      let url = "/antique-letter-close-up.png"
      let content: string | undefined = undefined

      // Process based on file type
      if (file.type.startsWith("image/")) {
        // For images, create a data URL
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString("base64")
        url = `data:${file.type};base64,${base64}`
      } else if (
        file.type.includes("text") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".csv")
      ) {
        // For text files, store the content directly
        content = await file.text()
        url = "/open-book-knowledge.png" // Fallback image for text files
      }

      const newDocument: Document = {
        id,
        name,
        url,
        content,
        contentType,
        status: "completed", // Set status to completed immediately
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      documents.push(newDocument)
      documentIds.push(id)

      // Start processing in the background
      processDocument(id, file)
    }

    revalidatePath("/")

    return {
      success: true,
      documentIds,
    }
  } catch (error) {
    console.error("Error uploading document:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

async function processDocument(id: string, file: File) {
  try {
    // Update status to processing
    const document = documents.find((doc) => doc.id === id)
    if (!document) return

    // Keep status as completed
    document.updatedAt = new Date().toISOString()

    // Revalidate to show processing status
    revalidatePath("/")
    revalidatePath(`/documents/${id}`)

    // Process the document content
    const { transcript, textMap } = await generateTranscript(file)

    // Update document with transcript
    document.transcript = transcript
    document.textMap = textMap
    document.status = "completed"
    document.updatedAt = new Date().toISOString()

    revalidatePath("/")
    revalidatePath(`/documents/${id}`)
  } catch (error) {
    console.error("Error processing document:", error)

    // Update status to failed
    const document = documents.find((doc) => doc.id === id)
    if (!document) return

    // Even on failure, keep status as completed so transcript is editable
    document.status = "completed"
    document.updatedAt = new Date().toISOString()

    revalidatePath("/")
    revalidatePath(`/documents/${id}`)
  }
}

export async function getDocuments() {
  // Sort by most recent first
  return [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getDocumentById(id: string) {
  return documents.find((doc) => doc.id === id)
}

export async function saveTranscript(id: string, transcript: string) {
  const document = documents.find((doc) => doc.id === id)
  if (!document) {
    throw new Error("Document not found")
  }

  document.transcript = transcript
  document.updatedAt = new Date().toISOString()

  revalidatePath(`/documents/${id}`)

  return { success: true }
}

export async function deleteDocuments(ids: string[]) {
  documents = documents.filter((doc) => !ids.includes(doc.id))
  revalidatePath("/")

  return { success: true }
}

export async function downloadTranscripts(ids: string[], format: string) {
  // In a real app, this would generate and return the files
  // For this demo, we'll just return success
  return { success: true }
}
