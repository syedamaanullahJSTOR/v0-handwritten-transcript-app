"use client"

// Import PDF.js in a way that's compatible with Next.js
import * as PDFJS from "pdfjs-dist"

// We'll initialize the worker in a useEffect hook instead of at module level
let pdfWorkerInitialized = false

/**
 * Initialize PDF.js worker
 */
export function initPdfWorker() {
  if (typeof window === "undefined" || pdfWorkerInitialized) return

  // Only initialize once
  pdfWorkerInitialized = true

  // Set worker source
  const pdfjsWorkerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString()

  PDFJS.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc
}

/**
 * Get the number of pages in a PDF document
 * @param pdfData ArrayBuffer or Uint8Array containing the PDF data
 * @returns Promise resolving to the number of pages
 */
export async function getPdfPageCount(pdfData: ArrayBuffer | Uint8Array): Promise<number> {
  try {
    // Ensure worker is initialized
    initPdfWorker()

    // Load the PDF document
    const loadingTask = PDFJS.getDocument({ data: pdfData })
    const pdf = await loadingTask.promise

    // Get the number of pages
    const pageCount = pdf.numPages

    // Clean up
    pdf.destroy()

    return pageCount
  } catch (error) {
    console.error("Error getting PDF page count:", error)
    // Return a default value if there's an error
    return 1
  }
}

/**
 * Get the number of pages from a PDF data URL
 * @param dataUrl PDF data URL (base64 encoded)
 * @returns Promise resolving to the number of pages
 */
export async function getPdfPageCountFromDataUrl(dataUrl: string): Promise<number> {
  try {
    // Extract the base64 data from the data URL
    const base64Data = dataUrl.split(",")[1]
    if (!base64Data) {
      throw new Error("Invalid data URL format")
    }

    // Convert base64 to binary
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Get the page count
    return await getPdfPageCount(bytes.buffer)
  } catch (error) {
    console.error("Error getting PDF page count from data URL:", error)
    return 1
  }
}

/**
 * Create a PDF.js document from a data URL
 * @param dataUrl PDF data URL
 * @returns Promise resolving to the PDF.js document
 */
export async function getPdfDocumentFromDataUrl(dataUrl: string): Promise<PDFJS.PDFDocumentProxy> {
  // Ensure worker is initialized
  initPdfWorker()

  // Extract the base64 data from the data URL
  const base64Data = dataUrl.split(",")[1]
  if (!base64Data) {
    throw new Error("Invalid data URL format")
  }

  // Convert base64 to binary
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Load the PDF document
  const loadingTask = PDFJS.getDocument({ data: bytes.buffer })
  return await loadingTask.promise
}
