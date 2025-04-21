"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, File, Loader2, AlertCircle } from "lucide-react"
import { uploadDocument } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function UploadDocuments() {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; documentIds?: string[] } | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Effect to handle redirection after successful upload
  useEffect(() => {
    if (uploadResult && uploadResult.success && uploadResult.documentIds?.length) {
      const redirectTimer = setTimeout(() => {
        if (uploadResult.documentIds?.length === 1) {
          // Log before redirect
          console.log(`Redirecting to document: ${uploadResult.documentIds[0]}`)

          // Navigate to the document view page with metadata tab active
          router.push(`/documents/${uploadResult.documentIds[0]}?tab=metadata`)
        } else {
          console.log("Redirecting to documents library")
          router.push("/documents")
        }
      }, 3000) // Longer delay to ensure toast is visible

      return () => clearTimeout(redirectTimer)
    }
  }, [uploadResult, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Check file size before setting
      const selectedFiles = Array.from(e.target.files)
      const oversizedFiles = selectedFiles.filter((file) => file.size > 10 * 1024 * 1024) // 10MB limit

      if (oversizedFiles.length > 0) {
        toast({
          title: "File size too large",
          description: "Some files exceed the 10MB size limit. Please select smaller files.",
          variant: "destructive",
        })

        // Filter out oversized files
        const validFiles = selectedFiles.filter((file) => file.size <= 10 * 1024 * 1024)
        setFiles(validFiles)
      } else {
        setFiles(selectedFiles)
      }

      setUploadError(null) // Clear any previous errors
      setUploadResult(null) // Reset upload result
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Check file size before setting
      const selectedFiles = Array.from(e.dataTransfer.files)
      const oversizedFiles = selectedFiles.filter((file) => file.size > 10 * 1024 * 1024) // 10MB limit

      if (oversizedFiles.length > 0) {
        toast({
          title: "File size too large",
          description: "Some files exceed the 10MB size limit. Please select smaller files.",
          variant: "destructive",
        })

        // Filter out oversized files
        const validFiles = selectedFiles.filter((file) => file.size <= 10 * 1024 * 1024)
        setFiles(validFiles)
      } else {
        setFiles(selectedFiles)
      }

      setUploadError(null)
      setUploadResult(null)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one document to upload.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setUploadResult(null)

    try {
      // Show initial upload toast
      toast({
        title: "Upload started",
        description: `Uploading ${files.length} document(s)...`,
      })

      // Create a FormData object
      const formData = new FormData()

      // Append each file to the FormData
      files.forEach((file) => {
        formData.append("files", file)
      })

      // Call the server action to upload the document
      const result = await uploadDocument(formData)
      console.log("Upload result:", result)

      if (result.success) {
        toast({
          title: "Upload successful",
          description: `${files.length} document(s) uploaded successfully. Redirecting to document view...`,
        })

        // Store the result for the useEffect to handle redirection
        setUploadResult(result)

        // Clear the file selection
        setFiles([])

        // Refresh the page data
        router.refresh()
      } else {
        // Check if we have document IDs despite the error (fallback storage worked)
        if (result.documentIds?.length > 0) {
          toast({
            title: "Upload completed with warnings",
            description: "Files were uploaded using fallback storage. Redirecting to document view...",
            variant: "warning",
          })

          setUploadResult(result)
          setFiles([])
          return
        }

        // Otherwise show the error
        setUploadError(result.error || "An unknown error occurred during upload")
        toast({
          title: "Upload failed",
          description: result.error || "An unknown error occurred during upload",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      setUploadError(errorMessage)
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Function to manually trigger redirection if automatic redirect fails
  const handleManualRedirect = () => {
    if (uploadResult?.documentIds?.length === 1) {
      router.push(`/documents/${uploadResult.documentIds[0]}?tab=metadata`)
    } else {
      router.push("/documents")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>
          Upload text documents (.txt, .md, .csv) or images (.jpg, .png) to generate AI transcripts with JSTOR
          Seeklight.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {uploadError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>
              {uploadError}
              <div className="mt-2 text-sm">
                Please try again with smaller files (under 10MB) or contact support if the issue persists.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {uploadResult?.success && (
          <Alert className="mb-6">
            <AlertTitle>Upload Successful</AlertTitle>
            <AlertDescription>
              Your document was uploaded successfully. You should be redirected automatically. If not,{" "}
              <Button variant="link" className="p-0 h-auto" onClick={handleManualRedirect}>
                click here
              </Button>{" "}
              to view your document.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid w-full gap-6">
            <div className="grid gap-2">
              <Label htmlFor="documents">Documents</Label>
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => document.getElementById("documents")?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Drag and drop your files here or click to browse</p>
                  <p className="text-xs text-muted-foreground">
                    Text files (.txt, .md, .csv) and images (.jpg, .png) will be displayed in the document viewer.
                    Maximum file size: 10MB.
                  </p>
                </div>
                <Input
                  id="documents"
                  type="file"
                  accept=".txt,.md,.csv,.jpg,.jpeg,.png,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {files.length > 0 && (
              <div className="grid gap-2">
                <Label>Selected Files</Label>
                <div className="border rounded-lg divide-y">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        {uploadResult?.success ? (
          <Button onClick={handleManualRedirect}>View Document</Button>
        ) : (
          <Button type="submit" onClick={handleSubmit} disabled={isUploading || files.length === 0}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload and Generate Transcript"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
