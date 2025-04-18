"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, FileText, Search, Trash2 } from "lucide-react"
import type { Document } from "@/lib/types"
import { getDocuments, deleteDocuments, downloadTranscripts } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

export function DocumentLibrary() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docs = await getDocuments()
        setDocuments(docs)
      } catch (error) {
        toast({
          title: "Failed to load documents",
          description: "There was an error loading your documents. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocuments()
  }, [toast])

  const filteredDocuments = documents.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments(filteredDocuments.map((doc) => doc.id))
    }
  }

  const handleSelectDocument = (id: string) => {
    if (selectedDocuments.includes(id)) {
      setSelectedDocuments(selectedDocuments.filter((docId) => docId !== id))
    } else {
      setSelectedDocuments([...selectedDocuments, id])
    }
  }

  const handleDelete = async () => {
    if (selectedDocuments.length === 0) return

    if (confirm(`Are you sure you want to delete ${selectedDocuments.length} document(s)?`)) {
      try {
        await deleteDocuments(selectedDocuments)
        setDocuments(documents.filter((doc) => !selectedDocuments.includes(doc.id)))
        setSelectedDocuments([])
        toast({
          title: "Documents deleted",
          description: `${selectedDocuments.length} document(s) have been deleted.`,
        })
      } catch (error) {
        toast({
          title: "Failed to delete documents",
          description: "There was an error deleting the selected documents. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleDownload = async (format: string) => {
    if (selectedDocuments.length === 0) return

    try {
      await downloadTranscripts(selectedDocuments, format)
      toast({
        title: "Download started",
        description: `${selectedDocuments.length} transcript(s) will be downloaded in ${format.toUpperCase()} format.`,
      })
    } catch (error) {
      toast({
        title: "Failed to download transcripts",
        description: "There was an error downloading the selected transcripts. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Library</CardTitle>
        <CardDescription>
          Manage your uploaded documents and transcripts. Transcripts are generated using Groq's Llama 3 70B model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documents..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDelete} disabled={selectedDocuments.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedDocuments.length === 0}
                  onClick={() => document.getElementById("download-menu")?.click()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <select
                  id="download-menu"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleDownload(e.target.value)
                      e.target.value = ""
                    }
                  }}
                >
                  <option value="">Select format</option>
                  <option value="vtt">VTT</option>
                  <option value="alto">ALTO</option>
                  <option value="hocr">hOCR</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Loading documents...</p>
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No documents found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {documents.length === 0
                  ? "Upload your first document to get started."
                  : "Try adjusting your search query."}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredDocuments.length > 0 && selectedDocuments.length === filteredDocuments.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all documents"
                      />
                    </TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead className="hidden md:table-cell">Date Uploaded</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={() => handleSelectDocument(doc.id)}
                          aria-label={`Select ${doc.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{doc.name}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(doc.createdAt)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center">
                          <div
                            className={`h-2 w-2 rounded-full mr-2 ${
                              doc.status === "completed"
                                ? "bg-green-500"
                                : doc.status === "processing"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          />
                          <span className="capitalize">{doc.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/documents/${doc.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
