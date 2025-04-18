import Link from "next/link"
import Image from "next/image"
import { ChevronRight, Upload, PlusSquare, FolderOpen } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"

export default function Home() {
  return (
    <MainLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-serif text-3xl font-medium mb-1">JSTOR Digital Stewardship Services</h1>
          <p className="text-gray-600 mb-8">Your home for all processing, cataloging, and managing collections.</p>

          {/* Tabs */}
          <div className="border-b mb-8">
            <div className="flex">
              <button className="px-4 py-2 border-b-2 border-black font-medium text-sm">Home</button>
              <button className="px-4 py-2 text-gray-600 text-sm">Statistics</button>
            </div>
          </div>

          {/* Get Started Section */}
          <section className="mb-12">
            <h2 className="font-serif text-xl font-medium mb-6">Get Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 - Updated with Seeklight and linked to upload page */}
              <Link
                href="/upload"
                className="border rounded-md p-6 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="mb-4">
                  <Upload size={24} className="text-gray-800" />
                </div>
                <h3 className="font-medium mb-2">Generate a transcript with JSTOR Seeklight</h3>
                <p className="text-sm text-gray-600 mb-6">Upload document files to create AI-generated transcripts.</p>
                <div className="flex justify-end">
                  <ChevronRight size={20} className="text-gray-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Card 2 */}
              <div className="border rounded-md p-6 hover:shadow-md transition-shadow">
                <div className="mb-4">
                  <PlusSquare size={24} className="text-gray-800" />
                </div>
                <h3 className="font-medium mb-2">Create a new project</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Define your materials, manage your items, and publish collections in a project
                </p>
                <div className="flex justify-end">
                  <ChevronRight size={20} className="text-gray-600" />
                </div>
              </div>

              {/* Card 3 */}
              <div className="border rounded-md p-6 hover:shadow-md transition-shadow">
                <div className="mb-4">
                  <FolderOpen size={24} className="text-gray-800" />
                </div>
                <h3 className="font-medium mb-2">Manage existing projects</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Process, edit, and manage your items in an existing project
                </p>
                <div className="flex justify-end">
                  <ChevronRight size={20} className="text-gray-600" />
                </div>
              </div>
            </div>
          </section>

          {/* Recently Accessed Projects */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-xl font-medium">Recently accessed projects</h2>
              <Link href="#" className="text-sm text-gray-600">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Project 1 */}
              <div>
                <div className="aspect-video bg-gray-200 mb-2 rounded overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-18%20at%202.33.44%E2%80%AFPM-ENBTrxKBUqg0lILpuQq4Y8MC3Q18QF.png"
                    alt="ACRL 11"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-sm font-medium">ACRL 11</h3>
                <p className="text-xs text-gray-600">11 items</p>
              </div>

              {/* Project 2 */}
              <div>
                <div className="aspect-video bg-gray-200 mb-2 rounded overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-18%20at%202.33.44%E2%80%AFPM-ENBTrxKBUqg0lILpuQq4Y8MC3Q18QF.png"
                    alt="ACRL Test 10"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-sm font-medium">ACRL Test 10</h3>
                <p className="text-xs text-gray-600">11 items</p>
              </div>

              {/* Project 3 */}
              <div>
                <div className="aspect-video bg-gray-200 mb-2 rounded overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-18%20at%202.33.44%E2%80%AFPM-ENBTrxKBUqg0lILpuQq4Y8MC3Q18QF.png"
                    alt="Wesleyan Demo"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-sm font-medium">Wesleyan Demo</h3>
                <p className="text-xs text-gray-600">15 items</p>
              </div>

              {/* Project 4 */}
              <div>
                <div className="aspect-video bg-gray-200 mb-2 rounded overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-04-18%20at%202.33.44%E2%80%AFPM-ENBTrxKBUqg0lILpuQq4Y8MC3Q18QF.png"
                    alt="UCF Demo 1"
                    width={300}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-sm font-medium">UCF Demo 1</h3>
                <p className="text-xs text-gray-600">11 items</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
