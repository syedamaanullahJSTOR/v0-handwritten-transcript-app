import { type NextRequest, NextResponse } from "next/server"
import { getDocumentById } from "@/lib/actions"
import { convertToVtt, convertToHocr, convertToTxt, convertToDoc } from "@/lib/converters"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const format = request.nextUrl.searchParams.get("format")

    if (!format) {
      return NextResponse.json({ error: "Format parameter is required" }, { status: 400 })
    }

    // Get the document from the database
    const document = await getDocumentById(id)

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (!document.transcript) {
      return NextResponse.json({ error: "No transcript available for this document" }, { status: 404 })
    }

    let content: string
    let contentType: string
    let filename: string

    switch (format.toLowerCase()) {
      case "vtt":
        content = await convertToVtt(document)
        contentType = "text/vtt"
        filename = `${document.name.split(".")[0]}.vtt`
        break
      case "doc":
        content = await convertToDoc(document)
        contentType = "application/msword"
        filename = `${document.name.split(".")[0]}.doc`
        break
      case "hocr":
        content = await convertToHocr(document)
        contentType = "text/html"
        filename = `${document.name.split(".")[0]}.html`
        break
      case "txt":
        content = await convertToTxt(document)
        contentType = "text/plain"
        filename = `${document.name.split(".")[0]}.txt`
        break
      default:
        return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
    }

    // Set appropriate headers for file download
    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error downloading transcript:", error)
    return NextResponse.json({ error: "Failed to download transcript" }, { status: 500 })
  }
}
