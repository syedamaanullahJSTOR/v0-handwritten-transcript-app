"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, RotateCcw, Save, Info } from "lucide-react"
import type { Document } from "@/lib/types"
import { saveTranscript } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface TranscriptEditorProps {
  document: Document
}

export function TranscriptEditor({ document: docData }: TranscriptEditorProps) {
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

  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Initialize transcript state when component mounts or document changes
  useEffect(() => {
    const defaultText = `George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.`

    // Set the transcript text from document or use default
    const transcriptText = docData.transcript || defaultText

    // Initialize all three transcript states
    setTranscript(transcriptText)
    setSavedTranscript(transcriptText)
    setOriginalTranscript(transcriptText)

    // Reset edit states
    setIsEdited(false)
    setIsOriginalModified(false)
  }, [docData])

  // Handle changes to the transcript text
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setTranscript(newText)
    setIsEdited(newText !== savedTranscript)
  }

  // Revert changes to the original transcript
  const handleRevert = () => {
    setTranscript(originalTranscript)
    setSavedTranscript(originalTranscript)
    setIsEdited(false)
    setIsOriginalModified(false)

    toast({
      title: "Transcript reverted",
      description: "The transcript has been restored to its original version.",
    })
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

  // Determine if the transcript is ready for editing
  const isTranscriptReady = true // Always allow editing regardless of document status

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

      <Tabs defaultValue="metadata" className="flex-1">
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
                defaultValue={docData.name.split(".")[0]}
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
              <Input id="alt-title" placeholder="Enter alternative title" className="w-full" />
            </div>

            {/* Creator field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="creator" className="font-medium uppercase text-xs tracking-wide">
                  CREATOR
                </Label>
                <Info className="h-4 w-4 ml-2 text-gray-400" />
              </div>
              <Input id="creator" placeholder="Enter creator" className="w-full" />
              <div className="text-xs text-gray-500">Confidence: High</div>
            </div>

            {/* Volume field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="volume" className="font-medium uppercase text-xs tracking-wide">
                  VOLUME
                </Label>
              </div>
              <Input id="volume" placeholder="Enter volume" className="w-full" />
            </div>

            {/* Type field */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="type" className="font-medium uppercase text-xs tracking-wide">
                  TYPE
                </Label>
                <Info className="h-4 w-4 ml-2 text-gray-400" />
              </div>
              <Input id="type" placeholder="Enter type" defaultValue="Letter" className="w-full" />
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
              <Input id="date" placeholder="Enter date" className="w-full" />
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
              <Input id="format" placeholder="Enter format" className="w-full" />
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
                      <option value="alto">ALTO</option>
                      <option value="hocr">hOCR</option>
                    </select>
                  </div>
                </div>
              </div>
              <textarea
                id="transcript-metadata"
                value={transcript}
                onChange={handleTextChange}
                onMouseUp={handleTextHighlight}
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
                    <option value="alto">ALTO</option>
                    <option value="hocr">hOCR</option>
                  </select>
                </div>
              </div>
            </div>
            <textarea
              value={transcript}
              onChange={handleTextChange}
              onMouseUp={handleTextHighlight}
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
