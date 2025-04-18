"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCw, Maximize, ChevronLeft, ChevronRight } from "lucide-react"
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
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate total pages based on document content
  useEffect(() => {
    // For text content, estimate pages based on content length
    if (document.content) {
      // Rough estimate: 2000 characters per page
      const contentLength = document.content.length
      const estimatedPages = Math.max(1, Math.ceil(contentLength / 2000))
      setTotalPages(estimatedPages)
    }
    // For image content, check if document has pages metadata
    else if (document.pages) {
      setTotalPages(document.pages)
    }
    // For documents with textMap, use that to estimate pages
    else if (document.textMap && document.textMap.length > 0) {
      // Estimate based on text map items (rough approximation)
      const estimatedPages = Math.max(1, Math.ceil(document.textMap.length / 100))
      setTotalPages(estimatedPages)
    }
    // Default fallback - use transcript length to estimate
    else if (document.transcript) {
      const transcriptLength = document.transcript.length
      const estimatedPages = Math.max(1, Math.ceil(transcriptLength / 3000))
      setTotalPages(estimatedPages)
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

  // Determine what type of content to display
  const renderDocumentContent = () => {
    // For text content
    if (document.content) {
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
          {document.content}
        </div>
      )
    }

    // For image content
    if (document.contentType.startsWith("image/") || document.url.startsWith("data:image/")) {
      return (
        <div
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: "center",
            transition: "transform 0.2s ease",
          }}
          className="relative"
        >
          <img
            src={document.url || "/placeholder.svg"}
            alt={document.name}
            className="max-w-none"
            style={{ maxHeight: "80vh" }}
          />

          {/* Overlay for text highlighting */}
          {document.textMap && highlightedText && (
            <div className="absolute inset-0">
              {document.textMap
                .filter((item) => item.text === highlightedText)
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
        </div>
      )
    }

    // Fallback for other content types
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium">{document.name}</h3>
        <p className="text-sm text-muted-foreground mt-2">
          This document type ({document.contentType}) cannot be previewed directly.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-sm font-medium">{document.name}</h2>
        <Button variant="ghost" size="sm">
          Edit Media
        </Button>
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
