import { notFound } from "next/navigation"
import { DocumentViewer } from "@/components/document-viewer"
import { TranscriptEditor } from "@/components/transcript-editor"
import { getDocumentById } from "@/lib/documents"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ChevronDown, CheckCircle } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"

interface DocumentPageProps {
  params: {
    id: string
  }
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  try {
    const document = await getDocumentById(params.id)

    if (!document) {
      notFound()
    }

    return (
      <MainLayout>
        <div className="flex flex-col h-full">
          {/* Navigation bar */}
          <div className="border-b px-4 py-3 flex items-center">
            <Link href="/documents">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">UCF Demo 1</span>
              </Button>
            </Link>

            <div className="flex items-center ml-4 text-sm text-gray-600">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="mx-2">3 of 11</span>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Document title bar */}
          <div className="border-b px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-lg font-medium">{document.name}</h1>
              <Button variant="ghost" size="sm" className="ml-2 h-6">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 text-sm">
                <CheckCircle className="h-4 w-4" />
                Mark as reviewed
              </Button>
              <Button variant="outline" size="sm" className="text-sm">
                Save
              </Button>
              <Button variant="outline" size="sm" className="text-sm">
                Save and close
              </Button>
              <Button variant="destructive" size="sm" className="text-sm">
                Publish
              </Button>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Transcript editor - left side (60%) */}
            <div className="w-[60%] border-r overflow-auto">
              <TranscriptEditor document={document} />
            </div>

            {/* Document viewer - right side (40%) */}
            <div className="w-[40%] overflow-auto">
              <DocumentViewer document={document} />
            </div>
          </div>
        </div>
      </MainLayout>
    )
  } catch (error) {
    console.error("Error loading document:", error)
    notFound()
  }
}
