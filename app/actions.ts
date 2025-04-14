"use server"

import * as Tesseract from "tesseract.js"

export async function processDocument(file: File): Promise<{ text: string; method: "extracted" | "ocr" }> {
  try {
    // For PDFs, we'll let the client handle the text extraction
    // since PDF.js works better in the browser
    if (file.type === "application/pdf") {
      // Just return empty text and let client handle it
      return { text: "", method: "extracted" }
    }

    // For images, run OCR on the server
    const ocrText = await performOCR(file)
    return { text: ocrText, method: "ocr" }
  } catch (error) {
    console.error("Error processing document:", error)
    throw new Error(`Failed to process document: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function performOCR(file: File): Promise<string> {
  try {
    // Convert the file to a Buffer or ArrayBuffer that Tesseract can work with
    const arrayBuffer = await file.arrayBuffer()

    // Use the Tesseract.recognize method directly instead of worker API
    const result = await Tesseract.recognize(new Uint8Array(arrayBuffer), "eng", {
      // Options for better handwritten text recognition
      tessedit_ocr_engine_mode: 2, // Legacy engine works better for handwritten text
      tessedit_pageseg_mode: 6, // Assume a single uniform block of text
      preserve_interword_spaces: 1,
    })

    return result.data.text
  } catch (error) {
    console.error("OCR Error:", error)
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
