"use server"

import type { Document } from "./types"

export async function convertToVtt(document: Document): Promise<string> {
  if (!document.transcript) {
    throw new Error("No transcript available")
  }

  // Split transcript into paragraphs for VTT cues
  const paragraphs = document.transcript.split(/\n\n+/).filter((p) => p.trim().length > 0)
  let vtt = "WEBVTT\n\n"

  paragraphs.forEach((paragraph, index) => {
    const startTime = formatVttTime(index * 5)
    const endTime = formatVttTime((index + 1) * 5)

    vtt += `${index + 1}\n`
    vtt += `${startTime} --> ${endTime}\n`
    vtt += `${paragraph.trim()}\n\n`
  })

  return vtt
}

export async function convertToAlto(document: Document): Promise<string> {
  if (!document.transcript) {
    throw new Error("No transcript available")
  }

  // Simple ALTO XML conversion
  const paragraphs = document.transcript.split(/\n\n+/).filter((p) => p.trim().length > 0)

  let alto = `<?xml version="1.0" encoding="UTF-8"?>
<alto xmlns="http://www.loc.gov/standards/alto/ns-v4#">
  <Description>
    <MeasurementUnit>pixel</MeasurementUnit>
    <sourceImageInformation>
      <fileName>${document.name}</fileName>
    </sourceImageInformation>
  </Description>
  <Layout>
    <Page ID="P1" WIDTH="800" HEIGHT="1000">
      <PrintSpace>
        <TextBlock ID="block1" HPOS="50" VPOS="50" WIDTH="700" HEIGHT="900">\n`

  paragraphs.forEach((paragraph, pIndex) => {
    alto += `        <TextLine ID="line${pIndex + 1}" HPOS="50" VPOS="${50 + pIndex * 30}" WIDTH="700" HEIGHT="25">\n`

    const words = paragraph.split(/\s+/).filter((w) => w.trim().length > 0)
    words.forEach((word, wIndex) => {
      // Escape XML special characters
      const safeWord = word
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")

      alto += `          <String ID="string${pIndex}_${wIndex}" CONTENT="${safeWord}" HPOS="${50 + wIndex * 50}" VPOS="${50 + pIndex * 30}" WIDTH="${word.length * 10}" HEIGHT="20" />\n`
    })

    alto += `        </TextLine>\n`
  })

  alto += `      </TextBlock>
    </PrintSpace>
  </Page>
</Layout>
</alto>`

  return alto
}

export async function convertToHocr(document: Document): Promise<string> {
  if (!document.transcript) {
    throw new Error("No transcript available")
  }

  // Simple hOCR conversion
  const paragraphs = document.transcript.split(/\n\n+/).filter((p) => p.trim().length > 0)

  let hocr = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="ocr-system" content="JSTOR Transcript Generator" />
  <meta name="ocr-capabilities" content="ocr_page ocr_carea ocr_par ocr_line ocrx_word" />
</head>
<body>
  <div class="ocr_page" id="page_1" title="image ${document.name}; bbox 0 0 800 1000">\n`

  paragraphs.forEach((paragraph, pIndex) => {
    hocr += `    <div class="ocr_par" id="par_${pIndex + 1}" title="bbox 50 ${50 + pIndex * 50} 750 ${90 + pIndex * 50}">\n`
    hocr += `      <span class="ocr_line" id="line_${pIndex + 1}" title="bbox 50 ${50 + pIndex * 50} 750 ${80 + pIndex * 50}">\n`

    const words = paragraph.split(/\s+/).filter((w) => w.trim().length > 0)
    words.forEach((word, wIndex) => {
      // Escape HTML special characters
      const safeWord = word
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")

      hocr += `        <span class="ocrx_word" id="word_${pIndex}_${wIndex}" title="bbox ${50 + wIndex * 50} ${50 + pIndex * 50} ${50 + wIndex * 50 + word.length * 10} ${70 + pIndex * 50}">${safeWord}</span>\n`
    })

    hocr += `      </span>\n`
    hocr += `    </div>\n`
  })

  hocr += `  </div>
</body>
</html>`

  return hocr
}

export async function convertToTxt(document: Document): Promise<string> {
  if (!document.transcript) {
    throw new Error("No transcript available")
  }

  // For plain text, we simply return the transcript as is
  return document.transcript
}

function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const millis = Math.floor((seconds % 1) * 1000)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`
}
