export interface Document {
  id: string
  name: string
  url: string
  content?: string
  contentType: string
  transcript?: string
  originalTranscript?: string
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: string
  updatedAt: string
  textMap?: TextMapItem[]
  pages?: number // Number of page markers in transcript
  actualPages?: number // Actual number of pages in the document
  metadata?: DocumentMetadata
  transcriptId?: string
}

export interface TextMapItem {
  id?: string
  text: string
  bbox: {
    x: number
    y: number
    width: number
    height: number
  }
  page?: number
}

export interface DocumentMetadata {
  id?: string
  title?: string
  alternativeTitle?: string
  creator?: string
  volume?: string
  documentType?: string
  documentDate?: string
  format?: string
}

export interface TranscriptVersion {
  id: string
  transcriptId: string
  content: string
  createdAt: string
  createdBy?: string
}
