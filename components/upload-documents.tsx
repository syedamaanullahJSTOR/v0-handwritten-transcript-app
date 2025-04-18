"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, File, Loader2 } from "lucide-react"
import { uploadDocument } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

export function UploadDocuments() {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
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

    try {
      // Create a FormData object
      const formData = new FormData()

      // Append each file to the FormData
      files.forEach((file) => {
        formData.append("files", file)
      })

      // Call the server action to upload the document
      const result = await uploadDocument(formData)

      if (result.success) {
        toast({
          title: "Upload successful",
          description: `${files.length} document(s) uploaded successfully. Groq is processing the content.`,
        })

        // If only one document was uploaded, navigate to it
        if (result.documentIds.length === 1) {
          router.push(`/documents/${result.documentIds[0]}`)
        } else {
          router.push("/documents")
          router.refresh()
        }

        // Clear the file selection
        setFiles([])
      } else {
        throw new Error(result.error || "Failed to upload documents")
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
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
        <form onSubmit={handleSubmit}>
          <div className="grid w-full gap-6">
            <div className="grid gap-2">
              <Label htmlFor="documents">Documents</Label>
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => document.getElementById("documents")?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Drag and drop your files here or click to browse</p>
                  <p className="text-xs text-muted-foreground">
                    Text files (.txt, .md, .csv) and images (.jpg, .png) will be displayed in the document viewer.
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
      </CardFooter>
    </Card>
  )
}
