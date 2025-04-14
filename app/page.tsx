"use client"

import { useState, useEffect } from "react"
import { FileUpload } from "@/components/file-upload"
import { TranscriptDisplay } from "@/components/transcript-display"
import { processDocument } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, FileText, AlertCircle, Settings, Zap } from "lucide-react"
import { extractTextFromPdf } from "@/utils/pdf-processor"
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
  const [fileName, setFileName] = useState<string | null>(null)
  const [processingMethod, setProcessingMethod] = useState<"extracted" | "ocr" | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false)
  const [pdfJsWorkerLoaded, setPdfJsWorkerLoaded] = useState(false)
  const [documentTruncated, setDocumentTruncated] = useState<boolean>(false)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [progressValue, setProgressValue] = useState<number>(0)
  const [processingTimeout, setProcessingTimeout] = useState<NodeJS.Timeout | null>(null)

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

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true)
      setError(null)
      setFileName(file.name)
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
            setIsProcessing(false)
            clearTimeout(timeout)
            return
          } else {
            console.log("Extracted text was too short or empty, falling back to OCR")
          }

          // If no meaningful text was extracted, run OCR directly on the PDF
          setProcessingStatus("No embedded text found. Running OCR on PDF...")
          // Get the total page count from the PDF
          try {
            const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
            const pageCount = pdf.numPages
            setTotalPages(pageCount)
            setDocumentTruncated(pageCount > 3)
          } catch (pageCountError) {
            console.error("Error getting page count:", pageCountError)
          }
          try {
            const ocrText = await performClientOCR(file, ocrOptions, handleOcrProgress)
            if (ocrText && ocrText.trim().length > 0) {
              setTranscript(formatTranscript(ocrText))
              setProcessingMethod("ocr")
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

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Document Transcript Generator</CardTitle>
          <CardDescription>Upload a document to extract text or generate a transcript using OCR</CardDescription>
        </CardHeader>
        <CardContent>
          {!transcript && !isProcessing ? (
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
                          onCheckedChange={(checked) =>
                            setOcrOptions({ ...ocrOptions, optimizeForHandwriting: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="quickMode">Quick Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Faster processing with slightly reduced accuracy
                          </p>
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
          ) : isProcessing ? (
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
          ) : (
            <Tabs defaultValue="transcript">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="info">Document Info</TabsTrigger>
              </TabsList>
              <TabsContent value="transcript" className="p-4">
                <TranscriptDisplay text={transcript || ""} />
              </TabsContent>
              <TabsContent value="info" className="p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium">File Name</h3>
                      <p className="text-sm text-muted-foreground">{fileName}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Processing Method</h3>
                      <p className="text-sm text-muted-foreground">
                        {processingMethod === "extracted" ? "Extracted from document" : "Generated using OCR"}
                      </p>
                    </div>
                    {processingMethod === "ocr" && (
                      <div>
                        <h3 className="font-medium">OCR Settings</h3>
                        <p className="text-sm text-muted-foreground">
                          {ocrOptions.optimizeForHandwriting
                            ? "Optimized for handwritten text"
                            : "Standard OCR (best for printed text)"}
                          {ocrOptions.quickMode ? " with Quick Mode" : ""}
                        </p>
                      </div>
                    )}
                    {documentTruncated && (
                      <div className="col-span-2">
                        <Alert className="mt-2 bg-amber-50 border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <AlertTitle className="text-amber-700">Page Limit Applied</AlertTitle>
                          <AlertDescription className="text-amber-600">
                            This document has {totalPages} pages. Only the first 3 pages were processed for performance
                            reasons.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {transcript && (
            <Button
              variant="outline"
              onClick={() => {
                setTranscript(null)
                setFileName(null)
                setProcessingMethod(null)
              }}
              className="mr-2"
            >
              Upload Another Document
            </Button>
          )}
          {transcript && (
            <Button
              onClick={() => {
                const blob = new Blob([transcript], { type: "text/plain" })
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
          )}
        </CardFooter>
      </Card>
    </main>
  )
}
