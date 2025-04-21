"use server"

import { revalidatePath } from "next/cache"
import { generateTranscript } from "./ocr"
import type { Document, TextMapItem } from "./types"
import { createServerSupabaseClient } from "./supabase"

// Fallback storage using base64 encoding
async function storeAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Upload a document
export async function uploadDocument(formData: FormData) {
  try {
    const supabase = createServerSupabaseClient()
    const files = formData.getAll("files") as File[]
    const documentIds: string[] = []

    for (const file of files) {
      let fileUrl: string
      let storagePath: string

      // Generate a unique filename to avoid collisions
      const uniquePrefix = Date.now().toString() + "-" + Math.random().toString(36).substring(2, 9)
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const fileName = `${uniquePrefix}-${safeFileName}`

      // Always use base64 storage for now to avoid Supabase storage issues
      try {
        console.log(`Storing file as base64: ${fileName}`)
        fileUrl = await storeAsBase64(file)

        // Store a reference to the file instead of the full data URL
        // This avoids issues with large data URLs in the database
        storagePath = `base64:${uniquePrefix}-${safeFileName}`

        console.log("File stored as base64")
      } catch (storageError) {
        console.error("Base64 storage failed:", storageError)
        throw new Error(
          `Failed to store file as base64: ${storageError instanceof Error ? storageError.message : String(storageError)}`,
        )
      }

      // Insert file record in database
      try {
        // Create a temporary table in localStorage to store the actual data URL
        // This is a workaround for the database size limitations
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`file_data_${uniquePrefix}`, fileUrl)
          } catch (e) {
            console.warn("Could not store file data in localStorage, it might be too large")
          }
        }

        const { data: fileData, error: fileError } = await supabase
          .from("files")
          .insert({
            filename: file.name,
            file_type: file.type || "application/octet-stream",
            blob_id: storagePath, // Store the reference path, not the full data URL
            size: file.size,
          })
          .select()
          .single()

        if (fileError) {
          throw new Error(`Failed to insert file record: ${fileError.message}`)
        }

        if (!fileData) {
          throw new Error("No file data returned after insert")
        }

        documentIds.push(fileData.id)

        // Start processing in the background
        processDocument(fileData.id, file, fileUrl)
      } catch (dbError) {
        console.error("Database error:", dbError)
        throw dbError
      }
    }

    revalidatePath("/")
    revalidatePath("/documents")

    return {
      success: true,
      documentIds,
      message: "Documents uploaded successfully",
    }
  } catch (error) {
    console.error("Error uploading document:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

// Process a document to generate transcript
async function processDocument(id: string, file: File, fileUrl: string) {
  try {
    const supabase = createServerSupabaseClient()

    // 1. Generate transcript
    const { transcript, textMap } = await generateTranscript(file)

    // 2. Insert transcript record
    const { data: transcriptData, error: transcriptError } = await supabase
      .from("transcripts")
      .insert({
        file_id: id,
        content: transcript,
        original_content: transcript, // Store original for revert functionality
        status: "completed",
      })
      .select()
      .single()

    if (transcriptError) {
      throw new Error(`Failed to insert transcript: ${transcriptError.message}`)
    }

    // 3. Insert text map records
    if (textMap && textMap.length > 0) {
      const textMapRecords = textMap.map((item) => ({
        transcript_id: transcriptData.id,
        text: item.text,
        x: item.bbox.x,
        y: item.bbox.y,
        width: item.bbox.width,
        height: item.bbox.height,
        page_number: item.page || 1, // Use the page number from the text map item
      }))

      const { error: textMapError } = await supabase.from("text_maps").insert(textMapRecords)

      if (textMapError) {
        console.error("Failed to insert text map records:", textMapError)
      }
    }

    // 4. Create empty metadata record
    const { error: metadataError } = await supabase.from("transcript_metadata").insert({
      transcript_id: transcriptData.id,
      title: file.name.split(".")[0],
    })

    if (metadataError) {
      console.error("Failed to insert metadata record:", metadataError)
    }

    revalidatePath("/")
    revalidatePath(`/documents/${id}`)
  } catch (error) {
    console.error("Error processing document:", error)

    const supabase = createServerSupabaseClient()

    // Update status to failed
    const { error: updateError } = await supabase.from("transcripts").update({ status: "failed" }).eq("file_id", id)

    if (updateError) {
      console.error("Failed to update transcript status:", updateError)
    }

    revalidatePath("/")
    revalidatePath(`/documents/${id}`)
  }
}

// Get all documents
export async function getDocuments(): Promise<Document[]> {
  try {
    const supabase = createServerSupabaseClient()

    // Query files and join with transcripts
    const { data: files, error } = await supabase
      .from("files")
      .select(`
        id,
        filename,
        file_type,
        blob_id,
        size,
        created_at,
        transcripts (
          id,
          content,
          status,
          created_at,
          updated_at,
          original_content
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Transform the data to match our Document interface
    const documents: Document[] = files.map((file) => {
      const transcript = file.transcripts && file.transcripts.length > 0 ? file.transcripts[0] : null

      // Generate a placeholder URL for the document
      // In a real app, you would retrieve the actual file content
      let url = file.blob_id

      // If this is a base64 reference, try to get it from localStorage
      if (url.startsWith("base64:") && typeof window !== "undefined") {
        const fileKey = `file_data_${url.split(":")[1]}`
        const storedData = localStorage.getItem(fileKey)
        if (storedData) {
          url = storedData
        } else {
          // Fallback to a placeholder if the data isn't in localStorage
          url = `/placeholder.svg?height=400&width=300&query=Document ${file.filename}`
        }
      }

      return {
        id: file.id,
        name: file.filename,
        url: url,
        contentType: file.file_type,
        transcript: transcript?.content,
        originalTranscript: transcript?.original_content || undefined,
        status: (transcript?.status as "pending" | "processing" | "completed" | "failed") || "completed",
        createdAt: file.created_at,
        updatedAt: transcript?.updated_at || file.created_at,
        transcriptId: transcript?.id,
      }
    })

    return documents
  } catch (error) {
    console.error("Error getting documents:", error)
    throw error
  }
}

// Get a document by ID
export async function getDocumentById(id: string): Promise<Document | null> {
  try {
    const supabase = createServerSupabaseClient()

    // Query the file
    const { data: file, error: fileError } = await supabase.from("files").select("*").eq("id", id).single()

    if (fileError) {
      if (fileError.code === "PGRST116") return null // Not found
      throw fileError
    }

    // Generate a URL for the document
    let url = file.blob_id

    // If this is a base64 reference, try to get it from localStorage
    if (url.startsWith("base64:") && typeof window !== "undefined") {
      const fileKey = `file_data_${url.split(":")[1]}`
      const storedData = localStorage.getItem(fileKey)
      if (storedData) {
        url = storedData
      } else {
        // Fallback to a placeholder if the data isn't in localStorage
        url = `/placeholder.svg?height=400&width=300&query=Document ${file.filename}`
      }
    }

    // Query the transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from("transcripts")
      .select("*")
      .eq("file_id", id)
      .single()

    if (transcriptError && transcriptError.code !== "PGRST116") throw transcriptError

    // Query text maps if transcript exists
    let textMap: TextMapItem[] = []
    if (transcript) {
      const { data: textMapData, error: textMapError } = await supabase
        .from("text_maps")
        .select("*")
        .eq("transcript_id", transcript.id)

      if (textMapError) throw textMapError

      textMap = textMapData.map((item) => ({
        text: item.text,
        bbox: {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        },
        page: item.page_number || 1,
      }))
    }

    // Query metadata if transcript exists
    let metadata = undefined
    if (transcript) {
      const { data: metadataData, error: metadataError } = await supabase
        .from("transcript_metadata")
        .select("*")
        .eq("transcript_id", transcript.id)
        .single()

      if (!metadataError) {
        metadata = {
          id: metadataData.id,
          title: metadataData.title || undefined,
          alternativeTitle: metadataData.alternative_title || undefined,
          creator: metadataData.creator || undefined,
          volume: metadataData.volume || undefined,
          documentType: metadataData.document_type || undefined,
          documentDate: metadataData.document_date || undefined,
          format: metadataData.format || undefined,
        }
      }
    }

    // Determine the number of pages
    let pages = 1
    if (transcript?.content) {
      const pageMatches = transcript.content.match(/Page \d+/g)
      if (pageMatches && pageMatches.length > 0) {
        pages = pageMatches.length
      }
    }

    // Construct the document object
    const document: Document = {
      id: file.id,
      name: file.filename,
      url: url,
      contentType: file.file_type,
      transcript: transcript?.content,
      originalTranscript: transcript?.original_content || undefined,
      status: (transcript?.status as "pending" | "processing" | "completed" | "failed") || "completed",
      createdAt: file.created_at,
      updatedAt: transcript?.updated_at || file.created_at,
      textMap,
      transcriptId: transcript?.id,
      metadata,
      pages,
    }

    return document
  } catch (error) {
    console.error("Error getting document by ID:", error)
    throw error
  }
}

// Save transcript changes
export async function saveTranscript(id: string, transcript: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Get the document to check if it has a transcript
    const document = await getDocumentById(id)
    if (!document) {
      throw new Error("Document not found")
    }

    const now = new Date().toISOString()

    if (document.transcriptId) {
      // Update existing transcript
      const { error } = await supabase
        .from("transcripts")
        .update({
          content: transcript,
          updated_at: now,
        })
        .eq("id", document.transcriptId)

      if (error) throw error

      // Add a version record
      await supabase.from("transcript_versions").insert({
        transcript_id: document.transcriptId,
        content: transcript,
      })
    } else {
      // Create new transcript
      const { data, error } = await supabase
        .from("transcripts")
        .insert({
          file_id: id,
          content: transcript,
          original_content: transcript,
          status: "completed",
        })
        .select()
        .single()

      if (error) throw error
    }

    revalidatePath(`/documents/${id}`)

    return { success: true }
  } catch (error) {
    console.error("Error saving transcript:", error)
    throw error
  }
}

// Revert transcript to original
export async function revertTranscript(id: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Get the document
    const document = await getDocumentById(id)
    if (!document || !document.transcriptId || !document.originalTranscript) {
      throw new Error("Document or original transcript not found")
    }

    // Update transcript to original content
    const { error } = await supabase
      .from("transcripts")
      .update({
        content: document.originalTranscript,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.transcriptId)

    if (error) throw error

    // Add a version record
    await supabase.from("transcript_versions").insert({
      transcript_id: document.transcriptId,
      content: document.originalTranscript,
    })

    revalidatePath(`/documents/${id}`)

    return { success: true }
  } catch (error) {
    console.error("Error reverting transcript:", error)
    throw error
  }
}

// Save metadata
export async function saveMetadata(id: string, metadata: any) {
  try {
    const supabase = createServerSupabaseClient()

    // Get the transcript ID
    const { data: transcript, error: transcriptError } = await supabase
      .from("transcripts")
      .select("id")
      .eq("file_id", id)
      .single()

    if (transcriptError) {
      throw new Error(`Failed to fetch transcript: ${transcriptError.message}`)
    }

    // Check if metadata record exists
    const { data: existingMetadata, error: metadataError } = await supabase
      .from("transcript_metadata")
      .select("id")
      .eq("transcript_id", transcript.id)
      .single()

    if (metadataError && metadataError.code !== "PGRST116") {
      throw new Error(`Failed to check existing metadata: ${metadataError.message}`)
    }

    if (existingMetadata) {
      // Update existing metadata
      const { error: updateError } = await supabase
        .from("transcript_metadata")
        .update({
          title: metadata.title,
          alternative_title: metadata.alternativeTitle,
          creator: metadata.creator,
          volume: metadata.volume,
          document_type: metadata.documentType,
          document_date: metadata.documentDate,
          format: metadata.format,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMetadata.id)

      if (updateError) {
        throw new Error(`Failed to update metadata: ${updateError.message}`)
      }
    } else {
      // Insert new metadata
      const { error: insertError } = await supabase.from("transcript_metadata").insert({
        transcript_id: transcript.id,
        title: metadata.title,
        alternative_title: metadata.alternativeTitle,
        creator: metadata.creator,
        volume: metadata.volume,
        document_type: metadata.documentType,
        document_date: metadata.documentDate,
        format: metadata.format,
      })

      if (insertError) {
        throw new Error(`Failed to insert metadata: ${insertError.message}`)
      }
    }

    revalidatePath(`/documents/${id}`)

    return { success: true }
  } catch (error) {
    console.error("Error saving metadata:", error)
    throw error
  }
}

// Delete documents
export async function deleteDocuments(ids: string[]) {
  try {
    const supabase = createServerSupabaseClient()

    // Delete files from database (cascade will delete related transcripts)
    const { error } = await supabase.from("files").delete().in("id", ids)

    if (error) throw error

    revalidatePath("/")
    revalidatePath("/documents")

    return { success: true }
  } catch (error) {
    console.error("Error deleting documents:", error)
    throw error
  }
}

// Download transcripts
export async function downloadTranscripts(ids: string[], format: string) {
  // This is handled by the API route
  return { success: true }
}
