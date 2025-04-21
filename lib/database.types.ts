export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      files: {
        Row: {
          id: string
          created_at: string
          size: number
          blob_id: string
          file_type: string
          filename: string
        }
        Insert: {
          id?: string
          created_at?: string
          size: number
          blob_id: string
          file_type: string
          filename: string
        }
        Update: {
          id?: string
          created_at?: string
          size?: number
          blob_id?: string
          file_type?: string
          filename?: string
        }
      }
      transcripts: {
        Row: {
          id: string
          file_id: string
          content: string
          status: string
          confidence: number | null
          created_at: string
          updated_at: string
          original_content: string | null
          actual_pages: number | null
        }
        Insert: {
          id?: string
          file_id: string
          content: string
          status?: string
          confidence?: number | null
          created_at?: string
          updated_at?: string
          original_content?: string | null
          actual_pages?: number | null
        }
        Update: {
          id?: string
          file_id?: string
          content?: string
          status?: string
          confidence?: number | null
          created_at?: string
          updated_at?: string
          original_content?: string | null
          actual_pages?: number | null
        }
      }
      transcript_versions: {
        Row: {
          id: string
          transcript_id: string
          content: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          transcript_id: string
          content: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          transcript_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
        }
      }
      transcript_metadata: {
        Row: {
          id: string
          transcript_id: string
          title: string | null
          alternative_title: string | null
          creator: string | null
          volume: string | null
          document_type: string | null
          document_date: string | null
          format: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transcript_id: string
          title?: string | null
          alternative_title?: string | null
          creator?: string | null
          volume?: string | null
          document_type?: string | null
          document_date?: string | null
          format?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transcript_id?: string
          title?: string | null
          alternative_title?: string | null
          creator?: string | null
          volume?: string | null
          document_type?: string | null
          document_date?: string | null
          format?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      text_maps: {
        Row: {
          id: string
          transcript_id: string
          text: string
          x: number
          y: number
          width: number
          height: number
          page_number: number | null
          created_at: string
        }
        Insert: {
          id?: string
          transcript_id: string
          text: string
          x: number
          y: number
          width: number
          height: number
          page_number?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          transcript_id?: string
          text?: string
          x?: number
          y?: number
          width?: number
          height?: number
          page_number?: number | null
          created_at?: string
        }
      }
      manifests: {
        Row: {
          id: string
          description: string | null
          manifest: Json | null
          created_at: string
          updated_at: string
          label: string | null
        }
        Insert: {
          id?: string
          description?: string | null
          manifest?: Json | null
          created_at?: string
          updated_at?: string
          label?: string | null
        }
        Update: {
          id?: string
          description?: string | null
          manifest?: Json | null
          created_at?: string
          updated_at?: string
          label?: string | null
        }
      }
      manifest_files: {
        Row: {
          id: string
          manifest_id: string
          file_id: string
          created_at: string
        }
        Insert: {
          id?: string
          manifest_id: string
          file_id: string
          created_at?: string
        }
        Update: {
          id?: string
          manifest_id?: string
          file_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
