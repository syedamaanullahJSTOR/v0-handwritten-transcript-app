"use server"

import type { Document } from "./types"

export async function convertToVtt(document: Document): Promise<string> {
  // Hardcoded text
  const hardcodedText = `George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.`

  // Split transcript into paragraphs for VTT cues
  const paragraphs = hardcodedText.split(/\n\n+/).filter((p) => p.trim().length > 0)
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

export async function convertToDoc(document: Document): Promise<string> {
  // Hardcoded text
  const hardcodedText = `George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.`

  // Create a simple HTML document that Word can open
  const docContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<title>${document.name}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
<!-- 
 /* Style Definitions */
p.MsoNormal, li.MsoNormal, div.MsoNormal
	{margin:0in;
	margin-bottom:.0001pt;
	font-size:12.0pt;
	font-family:"Times New Roman",serif;}
-->
</style>
</head>
<body>
<div class="WordSection1">
${hardcodedText
  .split("\n")
  .map((line) => `<p class="MsoNormal">${line}</p>`)
  .join("\n")}
</div>
</body>
</html>`

  return docContent
}

export async function convertToHocr(document: Document): Promise<string> {
  // Hardcoded text
  const hardcodedText = `George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.`

  // Simple hOCR conversion
  const paragraphs = hardcodedText.split(/\n\n+/).filter((p) => p.trim().length > 0)

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
  // Hardcoded text
  const hardcodedText = `George R. Fearing House, Harragansett Avenue
Newport, R.I.
A rather careful imitation of the French chateaux
of the 18th century, quite different from the
confused French-roofed American style of
the late 50's and 60's.`

  // For plain text, we simply return the hardcoded text
  return hardcodedText
}

function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const millis = Math.floor((seconds % 1) * 1000)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`
}
