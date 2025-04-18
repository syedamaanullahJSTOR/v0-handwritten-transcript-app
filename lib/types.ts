export interface Document {
  id: string
  name: string
  url: string
  content?: string // For storing text content
  contentType: string // To identify the type of content
  transcript?: string
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: string
  updatedAt: string
  textMap?: TextMapItem[]
  pages?: number // Number of pages in the document
}

export interface TextMapItem {
  text: string
  bbox: {
    x: number
    y: number
    width: number
    height: number
  }
}
