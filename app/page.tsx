"use client"

import { useState, useEffect } from "react"
import { FileUpload } from "@/components/file-upload"
import { TranscriptDisplay } from "@/components/transcript-display"
import { DocumentViewer } from "@/components/document-viewer"
import { processDocument } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, FileText, AlertCircle, Settings, Zap, SplitSquareVertical } from "lucide-react"
import { extractTextFromPdf, getPdfInfo, convertPdfPageToImage } from "@/utils/pdf-processor"
import { performClientOCR, type OCROptions, type OCRProgress } from "@/utils/ocr-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatTranscript } from "@/utils/format-transcript"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Define a consistent PDF.js version
const PDFJS_VERSION = "3.11.174"

export default function Home() {
  const [transcript, setTranscript] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [currentPageFile, setCurrentPageFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [processingMethod, setProcessingMethod] = useState<"extracted" | "ocr" | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false)
  const [pdfJsWorkerLoaded, setPdfJsWorkerLoaded] = useState(false)
  const [documentTruncated, setDocumentTruncated] = useState<boolean>(false)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [progressValue, setProgressValue] = useState<number>(0)
  const [processingTimeout, setProcessingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [viewMode, setViewMode] = useState<"transcript" | "document" | "split">("split")
  const [pageTranscripts, setPageTranscripts] = useState<Map<number, string>>(new Map())

  // OCR options
  const [ocrOptions, setOcrOptions] = useState<OCROptions>({
    optimizeForHandwriting: false,
    enhanceContrast: false,
    language: "eng",
    quickMode: false,
  })

  // Load PDF.js scripts
  useEffect(() => {
    if (typeof window === "undefined") return

    // Clear any existing PDF.js instances to avoid version conflicts
    if (window.pdfjsLib) {
      console.log("Existing PDF.js instance found, will be replaced")
    }

    // Load the main PDF.js library
    const loadMainScript = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script")
        script.src = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`
        script.async = true
        script.onload = () => {
          console.log("PDF.js main script loaded successfully")
          resolve()
        }
        script.onerror = () => {
          console.error("Failed to load PDF.js main script")
          reject(new Error("Failed to load PDF processing library"))
        }
        document.body.appendChild(script)
      })
    }

    // Load the PDF.js worker
    const loadWorkerScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (!window.pdfjsLib) {
          reject(new Error("PDF.js main script not loaded yet"))
          return
        }

        // Set the worker source
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`
        console.log("PDF.js worker source set")

        // Create a test script element to verify the worker loads
        const testScript = document.createElement("script")
        testScript.src = window.pdfjsLib.GlobalWorkerOptions.workerSrc
        testScript.async = true
        testScript.onload = () => {
          console.log("PDF.js worker script loaded successfully")
          setPdfJsWorkerLoaded(true)
          resolve()
        }
        testScript.onerror = () => {
          console.error("Failed to load PDF.js worker script")
          reject(new Error("Failed to load PDF worker library"))
        }
        document.body.appendChild(testScript)
      })
    }

    // Load scripts in sequence
    loadMainScript()
      .then(() => {
        setPdfJsLoaded(true)
        return loadWorkerScript()
      })
      .catch((err) => {
        console.error("Error loading PDF.js:", err)
        setError("Failed to load PDF processing library. Please try again later.")
      })

    // Cleanup function
    return () => {
      if (processingTimeout) {
        clearTimeout(processingTimeout)
      }
    }
  }, [processingTimeout])

  // Progress tracking function
  const handleOcrProgress = (progress: OCRProgress) => {
    setProcessingStatus(progress.message)
    setProgressValue(Math.round(progress.progress * 100))
  }

  // Handle page change in the document viewer
  const handlePageChange = async (page: number) => {
    if (!originalFile || page === currentPage) return

    setCurrentPage(page)

    try {
      // For PDFs, we need to convert the page to an image for display
      if (originalFile.type === "application/pdf") {
        const pageImage = await convertPdfPageToImage(originalFile, page)
        setCurrentPageFile(pageImage)

        // If we have a transcript for this page already, use it
        if (pageTranscripts.has(page)) {
          setTranscript(pageTranscripts.get(page) || "")
        } else {
          // Otherwise, try to extract text from this page
          setProcessingStatus(`Extracting text from page ${page}...`)
          setIsProcessing(true)

          try {
            // First try to extract text directly
            const pageText = await extractTextFromPdf(originalFile, page)

            if (pageText && pageText.trim().length > 10) {
              // Store the transcript for this page
              const newPageTranscripts = new Map(pageTranscripts)
              newPageTranscripts.set(page, pageText)
              setPageTranscripts(newPageTranscripts)
              setTranscript(pageText)
              setProcessingMethod("extracted")
            } else {
              // If no text was extracted, run OCR on this page
              setProcessingStatus(`Running OCR on page ${page}...`)
              const pageImage = await convertPdfPageToImage(originalFile, page)
              const ocrText = await performClientOCR(pageImage, ocrOptions)

              // Store the transcript for this page
              const newPageTranscripts = new Map(pageTranscripts)
              newPageTranscripts.set(page, ocrText)
              setPageTranscripts(newPageTranscripts)
              setTranscript(ocrText)
              setProcessingMethod("ocr")
            }
          } catch (error) {
            console.error(`Error processing page ${page}:`, error)
            setError(`Failed to process page ${page}. ${error instanceof Error ? error.message : ""}`)
          }

          setIsProcessing(false)
        }
      } else {
        // For non-PDFs, we just have one page
        setCurrentPageFile(originalFile)
      }
    } catch (error) {
      console.error("Error changing page:", error)
      setError(`Failed to change to page ${page}. ${error instanceof Error ? error.message : ""}`)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true)
      setError(null)
      setFileName(file.name)
      setOriginalFile(file)
      setCurrentPageFile(file)
      setCurrentPage(1)
      setPageTranscripts(new Map())
      setProcessingStatus("Preparing document...")
      setProgressValue(0)

      // Set a timeout to show a message if processing takes too long
      const timeout = setTimeout(() => {
        setProcessingStatus(
          (prevStatus) =>
            `${prevStatus} (This is taking longer than expected. Consider using Quick Mode for faster results.)`,
        )
      }, 15000) // 15 seconds

      setProcessingTimeout(timeout)

      // Get total pages for PDFs
      if (file.type === "application/pdf") {
        try {
          const pdfInfo = await getPdfInfo(file)
          setTotalPages(pdfInfo.numPages)
          setDocumentTruncated(pdfInfo.numPages > 3)
        } catch (pdfInfoError) {
          console.error("Error getting PDF info:", pdfInfoError)
          setTotalPages(1)
        }
      } else {
        setTotalPages(1)
        setDocumentTruncated(false)
      }

      // Handle PDFs on the client side
      if (file.type === "application/pdf") {
        // Check if PDF.js is loaded
        if (!pdfJsLoaded || !window.pdfjsLib) {
          setError("PDF processing library is not loaded yet. Please try again in a moment.")
          setIsProcessing(false)
          clearTimeout(timeout)
          return
        }

        try {
          setProcessingStatus("Extracting text from PDF...")
          setProgressValue(10)
          // First try to extract text directly from the PDF
          const extractedText = await extractTextFromPdf(file)
          setProgressValue(50)

          // If we got meaningful text, return it
          if (extractedText && extractedText.trim().length > 10) {
            setTranscript(formatTranscript(extractedText))
            setProcessingMethod("extracted")

            // Store the transcript for the first page
            const newPageTranscripts = new Map()
            newPageTranscripts.set(1, extractedText)
            setPageTranscripts(newPageTranscripts)

            // Convert the first page to an image for display
            const pageImage = await convertPdfPageToImage(file, 1)
            setCurrentPageFile(pageImage)

            setIsProcessing(false)
            clearTimeout(timeout)
            return
          } else {
            console.log("Extracted text was too short or empty, falling back to OCR")
          }

          // If no meaningful text was extracted, run OCR directly on the PDF
          setProcessingStatus("No embedded text found. Running OCR on PDF...")

          try {
            // Convert the first page to an image for display
            const pageImage = await convertPdfPageToImage(file, 1)
            setCurrentPageFile(pageImage)

            const ocrText = await performClientOCR(pageImage, ocrOptions, handleOcrProgress)
            if (ocrText && ocrText.trim().length > 0) {
              setTranscript(formatTranscript(ocrText))
              setProcessingMethod("ocr")

              // Store the transcript for the first page
              const newPageTranscripts = new Map()
              newPageTranscripts.set(1, ocrText)
              setPageTranscripts(newPageTranscripts)

              setIsProcessing(false)
              clearTimeout(timeout)
              return
            } else {
              throw new Error("OCR produced no text")
            }
          } catch (ocrError) {
            console.error("Client OCR failed:", ocrError)
            setProcessingStatus("Client OCR failed, trying server processing...")
            // Continue to server processing
          }
        } catch (pdfError) {
          console.error("Error processing PDF:", pdfError)
          // Fall back to server processing if client-side fails
          setProcessingStatus("Client-side processing failed, trying server...")
        }
      } else {
        setProcessingStatus("Processing image...")
        setProgressValue(10)

        // For images, run OCR directly with the current options
        try {
          const ocrText = await performClientOCR(file, ocrOptions, handleOcrProgress)
          if (ocrText && ocrText.trim().length > 0) {
            setTranscript(formatTranscript(ocrText))
            setProcessingMethod("ocr")
            setIsProcessing(false)
            clearTimeout(timeout)
            return
          }
        } catch (imageOcrError) {
          console.error("Image OCR failed:", imageOcrError)
          setProcessingStatus("Client OCR failed, trying server processing...")
        }
      }

      // For non-PDFs or if PDF processing failed, use server action
      setProcessingStatus("Processing document on server...")
      setProgressValue(70)
      try {
        const result = await processDocument(file)
        setProgressValue(90)

        if (result.text && result.text.trim().length > 0) {
          setTranscript(formatTranscript(result.text))
          setProcessingMethod(result.method)
        } else {
          throw new Error("No text could be extracted from this document")
        }
      } catch (serverError) {
        console.error("Server processing failed:", serverError)

        // If server fails for images, try client-side OCR as last resort
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
          try {
            setProcessingStatus("Trying client-side OCR as fallback...")
            const ocrText = await performClientOCR(file, ocrOptions, handleOcrProgress)
            if (ocrText && ocrText.trim().length > 0) {
              setTranscript(formatTranscript(ocrText))
              setProcessingMethod("ocr")
              setError(null) // Clear any previous errors
            } else {
              throw new Error("OCR produced no text")
            }
          } catch (fallbackError) {
            console.error("Fallback OCR failed:", fallbackError)
            setError(
              "All processing methods failed. This document may not contain extractable text or the text may be in an unsupported format.",
            )
          }
        } else {
          setError("Failed to extract text from this document. It may be encrypted, scanned, or contain no text.")
        }
      }

      setIsProcessing(false)
      clearTimeout(timeout)
    } catch (err) {
      setIsProcessing(false)
      if (processingTimeout) {
        clearTimeout(processingTimeout)
      }
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      console.error("General error:", err)
    }
  }

  // Render the split view layout
  const renderContent = () => {
    if (!transcript && !isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
          <div className="w-full flex justify-between mb-4">
            <Button
              variant={ocrOptions.quickMode ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setOcrOptions({ ...ocrOptions, quickMode: !ocrOptions.quickMode })}
            >
              <Zap className={`h-4 w-4 mr-2 ${ocrOptions.quickMode ? "text-white" : "text-yellow-500"}`} />
              {ocrOptions.quickMode ? "Quick Mode: ON" : "Quick Mode: OFF"}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  OCR Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>OCR Settings</DialogTitle>
                  <DialogDescription>
                    Configure OCR settings to improve text recognition for different document types.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="handwriting">Optimize for Handwritten Text</Label>
                      <p className="text-sm text-muted-foreground">
                        Applies special processing for handwritten documents
                      </p>
                    </div>
                    <Switch
                      id="handwriting"
                      checked={ocrOptions.optimizeForHandwriting}
                      onCheckedChange={(checked) => setOcrOptions({ ...ocrOptions, optimizeForHandwriting: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="quickMode">Quick Mode</Label>
                      <p className="text-sm text-muted-foreground">Faster processing with slightly reduced accuracy</p>
                    </div>
                    <Switch
                      id="quickMode"
                      checked={ocrOptions.quickMode}
                      onCheckedChange={(checked) => setOcrOptions({ ...ocrOptions, quickMode: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="contrast">Enhance Contrast</Label>
                      <p className="text-sm text-muted-foreground">
                        Improves contrast to better detect text on faded documents
                      </p>
                    </div>
                    <Switch
                      id="contrast"
                      checked={ocrOptions.enhanceContrast}
                      onCheckedChange={(checked) => setOcrOptions({ ...ocrOptions, enhanceContrast: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setOcrOptions({
                        optimizeForHandwriting: false,
                        enhanceContrast: false,
                        language: "eng",
                        quickMode: false,
                      })
                    }}
                    variant="outline"
                    className="mr-2"
                  >
                    Reset to Defaults
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <FileUpload onFileSelect={handleFileUpload} />
          <p className="mt-4 text-sm text-muted-foreground">Supported formats: PDF, PNG, JPG, TIFF</p>
          {ocrOptions.quickMode && (
            <p className="mt-2 text-sm text-yellow-600">Quick Mode is enabled for faster processing</p>
          )}
          {ocrOptions.optimizeForHandwriting && (
            <p className="mt-2 text-sm text-green-600">Handwritten text optimization is enabled</p>
          )}
          {!pdfJsLoaded && <p className="mt-2 text-sm text-amber-600">Loading PDF processing library...</p>}
          {pdfJsLoaded && !pdfJsWorkerLoaded && (
            <p className="mt-2 text-sm text-amber-600">Loading PDF worker library...</p>
          )}
        </div>
      )
    } else if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg">Processing your document...</p>
          <div className="w-full max-w-md mt-4">
            <Progress value={progressValue} className="h-2 w-full" />
            <p className="text-sm text-muted-foreground mt-2">{processingStatus}</p>
          </div>
          {ocrOptions.quickMode && (
            <p className="mt-2 text-sm text-yellow-600">Quick Mode is enabled for faster processing</p>
          )}
          {ocrOptions.optimizeForHandwriting && (
            <p className="mt-2 text-sm text-green-600">Using handwritten text optimization</p>
          )}
        </div>
      )
    } else {
      // Render the split view with document and transcript
      return (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <Button
                variant={viewMode === "split" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("split")}
                className="flex items-center"
              >
                <SplitSquareVertical className="h-4 w-4 mr-2" />
                Split View
              </Button>
              <Button
                variant={viewMode === "document" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("document")}
                className="flex items-center"
              >
                Document
              </Button>
              <Button
                variant={viewMode === "transcript" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("transcript")}
                className="flex items-center"
              >
                Transcript
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTranscript(null)
                setFileName(null)
                setProcessingMethod(null)
                setOriginalFile(null)
                setCurrentPageFile(null)
              }}
            >
              Upload Another Document
            </Button>
          </div>

          <div
            className={`grid gap-4 h-[calc(100vh-300px)] ${
              viewMode === "split" ? "grid-cols-2" : viewMode === "document" ? "grid-cols-1" : "grid-cols-1"
            }`}
          >
            {(viewMode === "split" || viewMode === "document") && (
              <div className="h-full">
                <DocumentViewer
                  file={currentPageFile}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}

            {(viewMode === "split" || viewMode === "transcript") && (
              <div className="h-full">
                <TranscriptDisplay text={transcript || ""} compact={viewMode === "split"} />
              </div>
            )}
          </div>

          {documentTruncated && (
            <Alert className="mt-4 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-700">Page Limit Applied</AlertTitle>
              <AlertDescription className="text-amber-600">
                This document has {totalPages} pages. Only the first 3 pages were processed for OCR. You can still
                navigate through all pages.
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                const blob = new Blob([transcript || ""], { type: "text/plain" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `${fileName?.split(".")[0] || "transcript"}.txt`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Download Transcript
            </Button>
          </div>
        </div>
      )
    }
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Document Transcript Generator</CardTitle>
          <CardDescription>Upload a document to extract text or generate a transcript using OCR</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
