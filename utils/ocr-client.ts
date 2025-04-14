"use client"

import * as Tesseract from "tesseract.js"
import { convertPdfToImages } from "./pdf-processor"
import { preprocessImageForHandwriting } from "./image-preprocessor"

// Client-side OCR function for direct browser processing
export async function performClientOCR(
  file: File,
  options: OCROptions = {},
  onProgress?: (progress: OCRProgress) => void,
): Promise<string> {
  try {
    let filesToProcess: File[] = []

    // If it's a PDF, convert it to images first
    let totalPages = 1
    let truncated = false

    if (file.type === "application/pdf") {
      onProgress?.({ stage: "pdf-conversion", progress: 0, message: "Converting PDF to images..." })
      const result = await convertPdfToImages(file, 3, (progress) => {
        onProgress?.({
          stage: "pdf-conversion",
          progress: progress,
          message: `Converting PDF to images (${Math.round(progress * 100)}%)...`,
        })
      })
      filesToProcess = result.images
      totalPages = result.totalPages
      truncated = result.truncated
      onProgress?.({ stage: "pdf-conversion", progress: 1, message: "PDF conversion complete" })
    } else {
      filesToProcess = [file]
    }

    let fullText = ""

    // Process each file (original image or converted PDF pages)
    for (let i = 0; i < filesToProcess.length; i++) {
      let currentFile = filesToProcess[i]
      const pageNum = i + 1
      const totalFilesToProcess = filesToProcess.length

      try {
        onProgress?.({
          stage: "preprocessing",
          progress: i / totalFilesToProcess,
          message: `Preparing ${file.type === "application/pdf" ? `page ${pageNum}/${totalFilesToProcess}` : "image"} for OCR...`,
        })

        // Apply preprocessing if handwritten text optimization is enabled and not in quick mode
        if (options.optimizeForHandwriting && !options.quickMode) {
          // Use quality setting based on quick mode
          const quality = options.quickMode ? "low" : "medium"
          currentFile = await preprocessImageForHandwriting(currentFile, quality)
        }

        onProgress?.({
          stage: "ocr",
          progress: i / totalFilesToProcess,
          message: `Running OCR on ${file.type === "application/pdf" ? `page ${pageNum}/${totalFilesToProcess}` : "image"}...`,
        })

        // Configure Tesseract options based on document type and performance settings
        const tesseractOptions: any = {
          // Base options
          preserve_interword_spaces: 1,
        }

        // Add progress reporting
        tesseractOptions.logger = (m: any) => {
          if (m.status === "recognizing text" && m.progress !== undefined) {
            onProgress?.({
              stage: "ocr",
              progress: (i + m.progress) / totalFilesToProcess,
              message: `Recognizing text on ${file.type === "application/pdf" ? `page ${pageNum}` : "image"}: ${Math.round(m.progress * 100)}%`,
            })
          }
        }

        // Add handwriting-specific options if enabled
        if (options.optimizeForHandwriting) {
          if (options.quickMode) {
            // Faster settings for quick mode
            Object.assign(tesseractOptions, {
              tessedit_ocr_engine_mode: 3, // Use default engine for speed
              tessedit_pageseg_mode: 1, // Automatic page segmentation
            })
          } else {
            // Full settings for handwriting
            Object.assign(tesseractOptions, {
              tessedit_ocr_engine_mode: 2, // Legacy engine works better for handwritten text
              tessedit_pageseg_mode: 6, // Assume a single uniform block of text
              tessjs_create_hocr: "0",
              tessjs_create_tsv: "0",
              load_system_dawg: 0, // Disable dictionary for handwriting
              load_freq_dawg: 0, // Disable frequency-based dictionary
            })
          }
        } else {
          // Options for printed text
          Object.assign(tesseractOptions, {
            tessedit_ocr_engine_mode: 3, // Default engine for printed text
            tessedit_pageseg_mode: 1, // Automatic page segmentation with OSD
          })
        }

        // Use the Tesseract.recognize method directly
        const result = await Tesseract.recognize(currentFile, "eng", tesseractOptions)

        if (result.data.text && result.data.text.trim()) {
          fullText += result.data.text + "\n\n"
        }
      } catch (ocrError) {
        console.error(`OCR failed for ${file.type === "application/pdf" ? `page ${i + 1}` : "image"}:`, ocrError)
        // Continue with next file
      }
    }

    onProgress?.({ stage: "complete", progress: 1, message: "OCR processing complete" })

    if (truncated) {
      fullText += `\n\n[Note: This document has ${totalPages} pages. Only the first 3 pages were processed.]`
    }

    if (!fullText.trim()) {
      throw new Error("OCR could not extract any text from the document")
    }

    return fullText.trim()
  } catch (error) {
    console.error("OCR processing error:", error)
    throw new Error(`Failed to process image with OCR: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// OCR options interface
export interface OCROptions {
  optimizeForHandwriting?: boolean
  enhanceContrast?: boolean
  language?: string
  quickMode?: boolean
}

// OCR progress interface
export interface OCRProgress {
  stage: "pdf-conversion" | "preprocessing" | "ocr" | "complete"
  progress: number
  message: string
}
