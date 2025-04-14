"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, FileText, Type, AlignLeft } from "lucide-react"
import { formatTranscript } from "@/utils/format-transcript"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TranscriptDisplayProps {
  text: string
  compact?: boolean
}

export function TranscriptDisplay({ text, compact = false }: TranscriptDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [formattedText, setFormattedText] = useState("")
  const [rawText, setRawText] = useState("")
  const [activeTab, setActiveTab] = useState<"formatted" | "raw">("formatted")

  useEffect(() => {
    // Store the raw text
    setRawText(text)

    // Format the text for better readability
    setFormattedText(formatTranscript(text))
  }, [text])

  const copyToClipboard = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className="absolute top-2 right-2 flex space-x-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => copyToClipboard(activeTab === "formatted" ? formattedText : rawText)}
          className="h-8 w-8"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <Tabs
        defaultValue="formatted"
        onValueChange={(value) => setActiveTab(value as "formatted" | "raw")}
        className="w-full flex-1 flex flex-col"
      >
        <TabsList className={`grid w-full grid-cols-2 ${compact ? "mb-2" : "mb-4"}`}>
          <TabsTrigger value="formatted" className="flex items-center">
            <Type className="h-4 w-4 mr-2" />
            Formatted
          </TabsTrigger>
          <TabsTrigger value="raw" className="flex items-center">
            <AlignLeft className="h-4 w-4 mr-2" />
            Raw Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formatted" className="flex-1 overflow-hidden flex flex-col">
          <div className={`p-4 bg-muted rounded-md flex-1 overflow-y-auto ${compact ? "text-sm" : ""}`}>
            {formattedText ? (
              <div className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                {formattedText.split("\n\n").map((paragraph, i) => (
                  <p key={i} className={`${compact ? "mb-2" : "mb-4"}`}>
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic">No text found in document</span>
            )}
          </div>
        </TabsContent>

        <TabsContent value="raw" className="flex-1 overflow-hidden flex flex-col">
          <div className={`p-4 bg-muted rounded-md flex-1 overflow-y-auto ${compact ? "text-sm" : ""}`}>
            {rawText ? (
              <pre className="whitespace-pre-wrap font-mono text-sm">{rawText}</pre>
            ) : (
              <span className="text-muted-foreground italic">No text found in document</span>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {!compact && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob([activeTab === "formatted" ? formattedText : rawText], { type: "text/plain" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = "transcript.txt"
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            className="flex items-center"
          >
            <FileText className="mr-2 h-4 w-4" />
            Download {activeTab === "formatted" ? "Formatted" : "Raw"} Text
          </Button>
        </div>
      )}
    </div>
  )
}
