"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DocumentViewerProps {
  file: File | null
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export function DocumentViewer({ file, currentPage = 1, totalPages = 1, onPageChange }: DocumentViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setObjectUrl(url)

      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [file])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      })
    }
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handlePrevPage = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1)
    }
  }

  if (!file || !objectUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-md">
        <p className="text-muted-foreground">No document to display</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" ref={viewerRef}>
      <div className="flex justify-between items-center p-2 bg-muted rounded-t-md">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || !onPageChange}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {totalPages > 1 && (
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || !onPageChange}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={handleZoomIn} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={toggleFullscreen} className="h-8 w-8">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted rounded-b-md p-4 flex items-center justify-center">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}>
          {file.type.startsWith("image/") ? (
            <img
              src={objectUrl || "/placeholder.svg"}
              alt="Document preview"
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: "calc(100vh - 200px)" }}
            />
          ) : file.type === "application/pdf" ? (
            <iframe
              src={`${objectUrl}#page=${currentPage}`}
              title="PDF Document"
              className="w-full h-full border-0"
              style={{ minWidth: "600px", minHeight: "800px" }}
            />
          ) : (
            <div className="p-4 bg-white rounded shadow">
              <p>Preview not available for this file type: {file.type}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
