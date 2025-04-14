"use client"

// Define a consistent PDF.js version
const PDFJS_VERSION = "3.11.174"

// Function to ensure PDF.js is properly loaded with matching API and worker versions
function ensurePdfJsLoaded() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Cannot load PDF.js in a server environment"))
      return
    }

    // Check if PDF.js is already loaded
    if (window.pdfjsLib) {
      // Set the worker source to match the API version
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`
      resolve()
      return
    }

    // If not loaded, reject
    reject(new Error("PDF.js is not loaded. Please try again."))
  })
}

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    // Ensure PDF.js is properly loaded
    await ensurePdfJsLoaded()

    // Get reference to PDF.js
    const pdfjsLib = window.pdfjsLib

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer()

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })

    try {
      const pdf = await loadingTask.promise
      console.log(`PDF loaded successfully with ${pdf.numPages} pages`)

      let fullText = ""

      // Process each page
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          console.log(`Processing page ${i}/${pdf.numPages}`)
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()

          if (!textContent || !textContent.items || textContent.items.length === 0) {
            console.log(`No text content found on page ${i}`)
            continue
          }

          const pageText = textContent.items.map((item: any) => (item.str || "").trim()).join(" ")

          fullText += pageText + "\n\n"
        } catch (pageError) {
          console.error(`Error extracting text from page ${i}:`, pageError)
          // Continue with next page
        }
      }

      return fullText.trim()
    } catch (pdfError) {
      console.error("Error processing PDF document:", pdfError)
      throw new Error(`Failed to process PDF: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`)
    }
  } catch (error) {
    console.error("Error extracting text from PDF:", error)
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function convertPdfPageToImage(file: File, pageNum = 1, scale = 1.5): Promise<File> {
  try {
    // Ensure PDF.js is properly loaded
    await ensurePdfJsLoaded()

    // Get reference to PDF.js
    const pdfjsLib = window.pdfjsLib

    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    // Make sure the requested page exists
    if (pageNum > pdf.numPages) {
      pageNum = 1 // Default to first page if requested page doesn't exist
    }

    const page = await pdf.getPage(pageNum)

    // Use a reduced scale for better performance
    const viewport = page.getViewport({ scale: scale })
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("Could not create canvas context")
    }

    canvas.height = viewport.height
    canvas.width = viewport.width

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise

    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], "page.png", { type: "image/png" }))
            } else {
              reject(new Error("Could not convert PDF to image"))
            }
          },
          "image/png",
          0.8, // Reduced quality for better performance
        )
      } catch (blobError) {
        reject(new Error(`Failed to create image blob: ${blobError}`))
      }
    })
  } catch (error) {
    console.error("Error converting PDF to image:", error)
    throw new Error(`Failed to convert PDF to image: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Function to convert multiple pages of a PDF to images
export async function convertPdfToImages(
  file: File,
  maxPages = 3,
  onProgress?: (progress: number) => void,
): Promise<{ images: File[]; totalPages: number; truncated: boolean }> {
  try {
    // Ensure PDF.js is properly loaded
    await ensurePdfJsLoaded()

    // Get reference to PDF.js
    const pdfjsLib = window.pdfjsLib

    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    // Get total page count
    const totalPages = pdf.numPages

    // Limit the number of pages to process
    const pagesToProcess = Math.min(pdf.numPages, maxPages)
    const imageFiles: File[] = []
    const truncated = totalPages > maxPages

    for (let i = 1; i <= pagesToProcess; i++) {
      try {
        // Report progress
        if (onProgress) {
          onProgress((i - 1) / pagesToProcess)
        }

        // Use a lower scale for better performance
        const scale = 1.5
        const imageFile = await convertPdfPageToImage(file, i, scale)
        imageFiles.push(imageFile)

        // Report progress after each page
        if (onProgress) {
          onProgress(i / pagesToProcess)
        }
      } catch (pageError) {
        console.error(`Error converting page ${i} to image:`, pageError)
        // Continue with next page
      }
    }

    if (imageFiles.length === 0) {
      throw new Error("Failed to convert any PDF pages to images")
    }

    return {
      images: imageFiles,
      totalPages,
      truncated,
    }
  } catch (error) {
    console.error("Error converting PDF to images:", error)
    throw new Error(`Failed to convert PDF to images: ${error instanceof Error ? error.message : String(error)}`)
  }
}
