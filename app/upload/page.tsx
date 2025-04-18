import { UploadDocuments } from "@/components/upload-documents"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"

export default function UploadPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6">Generate a transcript with JSTOR Seeklight</h1>

        <div className="max-w-3xl mx-auto">
          <UploadDocuments />
        </div>
      </div>
    </MainLayout>
  )
}
