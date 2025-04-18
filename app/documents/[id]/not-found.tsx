import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileX } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"

export default function DocumentNotFound() {
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileX className="h-16 w-16 text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Document Not Found</h1>
        <p className="text-gray-600 mb-6">The document you're looking for doesn't exist or may have been deleted.</p>
        <Link href="/documents">
          <Button>Return to Document Library</Button>
        </Link>
      </div>
    </MainLayout>
  )
}
