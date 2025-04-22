"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCw, Maximize, ChevronLeft, ChevronRight, FileText, Download } from "lucide-react"
import type { Document } from "@/lib/types"

interface DocumentViewerProps {
  document: Document
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [highlightedText, setHighlightedText] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1) // Default to 1 page
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate total pages based on document content
  useEffect(() => {
    // Check if document has pages metadata
    if (document.pages) {
      setTotalPages(document.pages)
    }
    // For documents with textMap, use that to determine pages
    else if (document.textMap && document.textMap.length > 0) {
      // Find the highest page number in the text map
      const maxPage = Math.max(...document.textMap.map((item) => item.page || 1))
      setTotalPages(maxPage)
    }
    // Check for "Page X" markers in the transcript
    else if (document.transcript) {
      const pageMatches = document.transcript.match(/Page \d+/g)
      if (pageMatches && pageMatches.length > 0) {
        setTotalPages(pageMatches.length)
      } else {
        // Fallback: estimate based on transcript length
        const transcriptLength = document.transcript.length
        const estimatedPages = Math.max(1, Math.ceil(transcriptLength / 3000))
        setTotalPages(estimatedPages)
      }
    }
  }, [document])

  // Listen for highlight events from the transcript editor
  useEffect(() => {
    const handleHighlight = (event: CustomEvent) => {
      setHighlightedText(event.detail.text)
    }

    window.addEventListener("highlight-text" as any, handleHighlight)

    return () => {
      window.removeEventListener("highlight-text" as any, handleHighlight)
    }
  }, [])

  // Listen for page change events from the transcript editor
  useEffect(() => {
    const handlePageChange = (event: CustomEvent) => {
      const { page } = event.detail
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page)
      }
    }

    window.addEventListener("change-page" as any, handlePageChange)

    return () => {
      window.removeEventListener("change-page" as any, handlePageChange)
    }
  }, [totalPages])

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Handle document download
  const handleDownload = () => {
    if (document.url) {
      try {
        // Create a simple anchor element to download the URL directly
        const a = document.createElement("a")
        a.href = document.url
        a.download = document.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch (error) {
        console.error("Error downloading file:", error)
        alert("Failed to download the file. Please try again.")
      }
    }
  }

  // Determine what type of content to display
  const renderDocumentContent = () => {
    // Check if we have a placeholder URL (meaning the actual file data is not available)
    if (document.url.includes("/placeholder.svg")) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">File Preview Not Available</h3>
          <p className="text-sm text-muted-foreground mt-2">
            The file data is not available in this session. This can happen if you've refreshed the page or opened it in
            a new tab.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Please try uploading the file again or view the transcript below.
          </p>
        </div>
      )
    }

    // For image content (JPG, PNG, GIF, etc.)
    if (document.contentType.startsWith("image/")) {
      return (
        <div
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: "center",
            transition: "transform 0.2s ease",
          }}
          className="relative"
        >
          {imageError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileText className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">Image could not be loaded</h3>
              <p className="text-sm text-muted-foreground mt-2">
                There was an error loading the image. The file might be corrupted or inaccessible.
              </p>
            </div>
          ) : (
            <>
              <img
                src={document.url || "/placeholder.svg"}
                alt={document.name}
                className="max-w-none"
                style={{ maxHeight: "80vh" }}
                onLoad={() => setIsImageLoaded(true)}
                onError={(e) => {
                  console.error("Error loading image:", document.url)
                  setImageError(true)
                }}
              />

              {/* Overlay for text highlighting */}
              {isImageLoaded && document.textMap && highlightedText && (
                <div className="absolute inset-0">
                  {document.textMap
                    .filter((item) => item.text === highlightedText && (item.page === currentPage || !item.page))
                    .map((item, index) => (
                      <div
                        key={index}
                        style={{
                          position: "absolute",
                          left: `${item.bbox.x}%`,
                          top: `${item.bbox.y}%`,
                          width: `${item.bbox.width}%`,
                          height: `${item.bbox.height}%`,
                          backgroundColor: "rgba(255, 255, 0, 0.3)",
                          border: "2px solid rgba(255, 200, 0, 0.8)",
                          pointerEvents: "none",
                        }}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    // For PDF content
    if (document.contentType === "application/pdf") {
      // If it's a data URL, we need to handle it differently
      if (document.url.startsWith("data:")) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">PDF Preview Not Available</h3>
            <p className="text-sm text-muted-foreground mt-2">
              PDF preview is not available for base64 encoded files. Please download the file to view it.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        )
      }

      return (
        <div className="w-full h-full flex items-center justify-center">
          <iframe
            src={`${document.url}#page=${currentPage}&zoom=${zoom / 100}`}
            title={document.name}
            className="w-full h-full border-0"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center",
              transition: "transform 0.2s ease",
            }}
          />
        </div>
      )
    }

    // For text content (TXT, MD, CSV, etc.)
    if (
      document.contentType.startsWith("text/") ||
      document.contentType === "application/csv" ||
      document.contentType === "text/markdown"
    ) {
      return (
        <div
          className="bg-white p-6 rounded shadow-inner w-full h-full overflow-auto"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            transition: "transform 0.2s ease",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
          }}
        >
          {document.content || "No content available"}
        </div>
      )
    }

    // Fallback: If we can't display the document directly, show a preview with transcript
    return (
      <div className="bg-white p-6 rounded shadow-inner w-full h-full overflow-auto">
        <div className="flex flex-col">
          <div className="mb-6 text-center">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-medium">{document.name}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This document type ({document.contentType}) cannot be previewed directly.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Original
            </Button>
          </div>

          {document.transcript && (
            <div className="border-t pt-4">
              <div className="text-lg font-bold mb-4">Transcript Preview - Page {currentPage}</div>
              <div className="whitespace-pre-wrap font-serif">
                {/* Extract and display the current page content from the transcript */}
                {(() => {
                  if (!document.transcript) return ""

                  // Check if the transcript has page markers
                  const pageMatches = document.transcript.match(/Page \d+/g)
                  if (pageMatches && pageMatches.length > 0) {
                    // Split by page markers
                    const pages = document.transcript.split(/Page \d+/)
                    // Remove the first empty element if it exists
                    if (pages[0].trim() === "") pages.shift()

                    // Return the content for the current page (if it exists)
                    return currentPage <= pages.length ? pages[currentPage - 1] : ""
                  }

                  // Fallback: just return the full transcript
                  return document.transcript
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-sm font-medium">{document.name}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="ghost" size="sm">
            Edit Media
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex justify-between items-center p-2 border-b">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevPage} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={nextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Document content */}
        <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center p-4 bg-gray-100">
          {renderDocumentContent()}
        </div>
      </div>
    </div>
  )
}
