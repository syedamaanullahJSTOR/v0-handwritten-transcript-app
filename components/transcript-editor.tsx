"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, RotateCcw, Save, Info, Sparkles } from "lucide-react"
import type { Document } from "@/lib/types"
import { saveTranscript, revertTranscript, saveMetadata, enhanceTranscript } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface TranscriptEditorProps {
  document: Document
  defaultTab?: "metadata" | "transcript"
}

export function TranscriptEditor({ document: docData, defaultTab = "metadata" }: TranscriptEditorProps) {
  // Current editable transcript
  const [transcript, setTranscript] = useState<string>("")

  // Last saved transcript (for detecting changes)
  const [savedTranscript, setSavedTranscript] = useState<string>("")

  // Original transcript from when document was first loaded (for revert)
  const [originalTranscript, setOriginalTranscript] = useState<string>("")

  // Track if current text differs from saved version
  const [isEdited, setIsEdited] = useState(false)

  // Track if original has been modified (for revert button)
  const [isOriginalModified, setIsOriginalModified] = useState(false)

  // Metadata fields
  const [title, setTitle] = useState<string>("")
  const [alternativeTitle, setAlternativeTitle] = useState<string>("")
  const [creator, setCreator] = useState<string>("")
  const [volume, setVolume] = useState<string>("")
  const [documentType, setDocumentType] = useState<string>("")
  const [documentDate, setDocumentDate] = useState<string>("")
  const [format, setFormat] = useState<string>("")
  const [isMetadataEdited, setIsMetadataEdited] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLTextAreaElement>(null)
  const metadataTranscriptRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Initialize transcript state when component mounts or document changes
  useEffect(() => {
    // Hardcoded text as requested
    const hardcodedText = `George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.`

    // Initialize all three transcript states with the hardcoded text
    setTranscript(hardcodedText)
    setSavedTranscript(hardcodedText)
    setOriginalTranscript(hardcodedText)

    // Initialize metadata fields
    if (docData.metadata) {
      setTitle(docData.metadata.title || docData.name.split(".")[0] || "")
      setAlternativeTitle(docData.metadata.alternativeTitle || "")
      setCreator(docData.metadata.creator || "")
      setVolume(docData.metadata.volume || "")
      setDocumentType(docData.metadata.documentType || "")
      setDocumentDate(docData.metadata.documentDate || "")
      setFormat(docData.metadata.format || "")
    } else {
      setTitle(docData.name.split(".")[0] || "")
    }

    // Reset edit states
    setIsEdited(false)
    setIsMetadataEdited(false)
    setIsOriginalModified(docData.transcript !== docData.originalTranscript)
  }, [docData])

  // Handle changes to the transcript text
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setTranscript(newText)
    setIsEdited(newText !== savedTranscript)
  }

  // Handle changes to metadata fields
  const handleMetadataChange = (field: string, value: string) => {
    switch (field) {
      case "title":
        setTitle(value)
        break
      case "alternativeTitle":
        setAlternativeTitle(value)
        break
      case "creator":
        setCreator(value)
        break
      case "volume":
        setVolume(value)
        break
      case "documentType":
        setDocumentType(value)
        break
      case "documentDate":
        setDocumentDate(value)
        break
      case "format":
        setFormat(value)
        break
    }
    setIsMetadataEdited(true)
  }

  // Revert changes to the original transcript
  const handleRevert = async () => {
    try {
      setIsSaving(true)
      await revertTranscript(docData.id)

      setTranscript(originalTranscript)
      setSavedTranscript(originalTranscript)
      setIsEdited(false)
      setIsOriginalModified(false)

      toast({
        title: "Transcript reverted",
        description: "The transcript has been restored to its original version.",
      })
    } catch (error) {
      toast({
        title: "Failed to revert transcript",
        description: "There was an error reverting the transcript. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Save changes to the transcript
  const handleSave = async () => {
    if (!isEdited) return

    setIsSaving(true)

    try {
      await saveTranscript(docData.id, transcript)

      // Update saved transcript to current version
      setSavedTranscript(transcript)

      // If this is the first edit after loading, mark original as modified
      if (!isOriginalModified) {
        setIsOriginalModified(true)
      }

      setIsEdited(false)

      toast({
        title: "Transcript saved",
        description: "Your changes have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Failed to save transcript",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Enhance transcript with AI
  const handleEnhanceWithAI = async () => {
    setIsEnhancing(true)

    try {
      toast({
        title: "Enhancing transcript with AI",
        description: "This may take a moment...",
      })

      // First, make sure we have a transcript to enhance
      if (!transcript || transcript.trim() === "") {
        throw new Error("No transcript content to enhance")
      }

      // If the transcript hasn't been saved yet, save it first
      if (isEdited) {
        await saveTranscript(docData.id, transcript)
        toast({
          title: "Transcript saved",
          description: "Your changes have been saved before enhancement.",
        })
      }

      // Now enhance the transcript
      await enhanceTranscript(docData.id)

      // Show success message
      toast({
        title: "Transcript enhanced",
        description: "The transcript has been enhanced with AI. Refreshing page to show updates...",
      })

      // Refresh the page to get the updated transcript
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error("Error enhancing transcript:", error)

      toast({
        title: "Failed to enhance transcript",
        description:
          error instanceof Error ? error.message : "There was an error enhancing the transcript. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEnhancing(false)
    }
  }

  // Save metadata changes
  const handleSaveMetadata = async () => {
    if (!isMetadataEdited) return

    setIsSaving(true)

    try {
      await saveMetadata(docData.id, {
        title,
        alternativeTitle,
        creator,
        volume,
        documentType,
        documentDate,
        format,
      })

      setIsMetadataEdited(false)

      toast({
        title: "Metadata saved",
        description: "Your metadata changes have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Failed to save metadata",
        description: "There was an error saving your metadata changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = async (format: string) => {
    try {
      // Show loading toast
      toast({
        title: `Preparing ${format.toUpperCase()} download...`,
        description: "Converting transcript to the selected format.",
      })

      // Make the API request to get the converted transcript
      const response = await fetch(`/api/transcripts/${docData.id}/download?format=${format}`)

      if (!response.ok) {
        throw new Error(`Failed to download transcript: ${response.statusText}`)
      }

      // Get the filename from the Content-Disposition header if available
      let filename = `${docData.name.split(".")[0]}.${format}`
      const contentDisposition = response.headers.get("Content-Disposition")
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1]
        }
      }

      // Get the blob from the response
      const blob = await response.blob()

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary anchor element to trigger the download
      const a = window.document.createElement("a")
      a.href = url
      a.download = filename
      window.document.body.appendChild(a)
      a.click()

      // Clean up
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Show success toast
      toast({
        title: "Download complete",
        description: `Transcript has been downloaded as ${format.toUpperCase()} format.`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleTextHighlight = () => {
    if (!editorRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString().trim()

    if (selectedText) {
      // Dispatch custom event with the selected text
      const event = new CustomEvent("highlight-text", {
        detail: { text: selectedText },
      })
      window.dispatchEvent(event)
    }
  }

  // Handle click in transcript to navigate to page
  const handleTranscriptClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const text = textarea.value
    const cursorPosition = textarea.selectionStart

    // Find the position of all "Page X" markers
    const pageMarkers = [...text.matchAll(/Page \d+/g)]
    if (!pageMarkers.length) return

    // Determine which page section the cursor is in
    let currentPage = 1
    for (const match of pageMarkers) {
      if (match.index !== undefined && match.index <= cursorPosition) {
        // Extract the page number from the match
        const pageMatch = match[0].match(/\d+/)
        if (pageMatch) {
          currentPage = Number.parseInt(pageMatch[0], 10)
        }
      } else {
        // We've gone past the cursor position, so stop
        break
      }
    }

    // Dispatch event to change page in document viewer
    const event = new CustomEvent("change-page", {
      detail: { page: currentPage },
    })
    window.dispatchEvent(event)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-sm font-medium">Item details</span>
          <span className="text-xs text-gray-500 ml-2">Catalog your items, edit your transcripts, and more.</span>
        </div>
        <div className="flex items-center">
          <Button variant="outline" size="sm" className="text-xs">
            AI Generated
          </Button>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="flex-1">
        <div className="border-b px-4">
          <TabsList className="mt-2">
            <TabsTrigger value="metadata" className="text-sm">
              Metadata
            </TabsTrigger>
            <TabsTrigger value="transcript" className="text-sm">
              Transcript
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="metadata" className="flex-1 p-0 m-0 overflow-auto">
          <div className="p-4 space-y-6">
            {/* Title field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="title" className="font-medium uppercase text-xs tracking-wide">
                  TITLE
                </Label>
                <Info className="h-4 w-4 ml-2 text-gray-400" />
              </div>
              <Input
                id="title"
                placeholder="Enter title"
                value={title}
                onChange={(e) => handleMetadataChange("title", e.target.value)}
                className="w-full"
              />
              <div className="text-xs text-gray-500">Confidence: Low</div>
            </div>

            {/* Alternative Title field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="alt-title" className="font-medium uppercase text-xs tracking-wide">
                  ALTERNATIVE TITLE
                </Label>
                <Info className="h-4 w-4 ml-2 text-gray-400" />
              </div>
              <Input
                id="alt-title"
                placeholder="Enter alternative title"
                value={alternativeTitle}
                onChange={(e) => handleMetadataChange("alternativeTitle", e.target.value)}
                className="w-full"
              />
            </div>

            {/* Creator field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="creator" className="font-medium uppercase text-xs tracking-wide">
                  CREATOR
                </Label>
                <Info className="h-4 w-4 ml-2 text-gray-400" />
              </div>
              <Input
                id="creator"
                placeholder="Enter creator"
                value={creator}
                onChange={(e) => handleMetadataChange("creator", e.target.value)}
                className="w-full"
              />
              <div className="text-xs text-gray-500">Confidence: High</div>
            </div>

            {/* Volume field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="volume" className="font-medium uppercase text-xs tracking-wide">
                  VOLUME
                </Label>
              </div>
              <Input
                id="volume"
                placeholder="Enter volume"
                value={volume}
                onChange={(e) => handleMetadataChange("volume", e.target.value)}
                className="w-full"
              />
            </div>

            {/* Type field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="type" className="font-medium uppercase text-xs tracking-wide">
                  TYPE
                </Label>
                <Info className="h-4 w-4 ml-2 text-gray-400" />
              </div>
              <Input
                id="type"
                placeholder="Enter type"
                value={documentType}
                onChange={(e) => handleMetadataChange("documentType", e.target.value)}
                className="w-full"
              />
              <div className="text-xs text-gray-500">Confidence: Low</div>
            </div>

            {/* Date field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="date" className="font-medium uppercase text-xs tracking-wide">
                  DATE
                </Label>
                <Info className="h-4 w-4 ml-2 text-gray-400" />
              </div>
              <Input
                id="date"
                placeholder="Enter date"
                value={documentDate}
                onChange={(e) => handleMetadataChange("documentDate", e.target.value)}
                className="w-full"
              />
              <div className="text-xs text-gray-500">Confidence: Low</div>
            </div>

            {/* Format field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="format" className="font-medium uppercase text-xs tracking-wide">
                  FORMAT
                </Label>
                <Info className="h-4 w-4 ml-2 text-gray-400" />
              </div>
              <Input
                id="format"
                placeholder="Enter format"
                value={format}
                onChange={(e) => handleMetadataChange("format", e.target.value)}
                className="w-full"
              />
            </div>

            {/* Save metadata button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveMetadata}
                disabled={!isMetadataEdited || isSaving}
                className="text-xs"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Metadata"}
              </Button>
            </div>

            {/* Transcript field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Label htmlFor="transcript-metadata" className="font-medium uppercase text-xs tracking-wide">
                    TRANSCRIPT
                  </Label>
                  <Info className="h-4 w-4 ml-2 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnhanceWithAI}
                    disabled={isEnhancing}
                    className="text-xs"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isEnhancing ? "Enhancing..." : "Enhance with AI"}
                  </Button>
                  {isOriginalModified && (
                    <Button variant="outline" size="sm" onClick={handleRevert} className="text-xs">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Revert to Original
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={!isEdited || isSaving}
                    className="text-xs"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.document.getElementById("format-menu")?.click()}
                      className="text-xs"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <select
                      id="format-menu"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleDownload(e.target.value)
                          e.target.value = ""
                        }
                      }}
                    >
                      <option value="">Select format</option>
                      <option value="txt">TXT</option>
                      <option value="vtt">VTT</option>
                      <option value="doc">DOC</option>
                      <option value="hocr">hOCR</option>
                    </select>
                  </div>
                </div>
              </div>
              <textarea
                id="transcript-metadata"
                ref={metadataTranscriptRef}
                value={transcript}
                onChange={handleTextChange}
                onMouseUp={handleTextHighlight}
                onClick={handleTranscriptClick}
                onKeyUp={handleTextHighlight}
                className="w-full h-64 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
                placeholder="Transcript will appear here..."
              />
              <div className="text-xs text-gray-500">Confidence: Medium</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transcript" className="flex-1 p-0 m-0 overflow-auto">
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="font-medium text-base">Document Transcript</h3>
                <div className="text-xs text-gray-500 ml-2">Confidence: Medium</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnhanceWithAI}
                  disabled={isEnhancing}
                  className="text-xs"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isEnhancing ? "Enhancing..." : "Enhance with AI"}
                </Button>
                {isOriginalModified && (
                  <Button variant="outline" size="sm" onClick={handleRevert} className="text-xs">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Revert to Original
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!isEdited || isSaving}
                  className="text-xs"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.document.getElementById("transcript-format-menu")?.click()}
                    className="text-xs"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <select
                    id="transcript-format-menu"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleDownload(e.target.value)
                        e.target.value = ""
                      }
                    }}
                  >
                    <option value="">Select format</option>
                    <option value="txt">TXT</option>
                    <option value="vtt">VTT</option>
                    <option value="doc">DOC</option>
                    <option value="hocr">hOCR</option>
                  </select>
                </div>
              </div>
            </div>
            <textarea
              ref={transcriptRef}
              value={transcript}
              onChange={handleTextChange}
              onMouseUp={handleTextHighlight}
              onClick={handleTranscriptClick}
              onKeyUp={handleTextHighlight}
              className="w-full flex-1 p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
              placeholder="Transcript will appear here..."
              style={{ minHeight: "calc(100vh - 300px)" }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
