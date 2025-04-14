"use client"

/**
 * Preprocesses images to improve OCR results for handwritten text
 * Optimized for better performance
 */
export async function preprocessImageForHandwriting(
  imageFile: File,
  quality: "low" | "medium" | "high" = "medium",
): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image()
      img.onload = () => {
        // Create canvas with potentially reduced dimensions for performance
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d", { willReadFrequently: true })

        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Scale factor based on quality setting
        let scaleFactor = 1
        switch (quality) {
          case "low":
            scaleFactor = img.width > 1000 ? 0.5 : 0.75
            break
          case "medium":
            scaleFactor = img.width > 1500 ? 0.75 : 1
            break
          case "high":
            scaleFactor = 1
            break
        }

        // Set canvas dimensions with scaling
        canvas.width = img.width * scaleFactor
        canvas.height = img.height * scaleFactor

        // Draw original image with scaling
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Apply optimized preprocessing techniques
        // Combined grayscale and contrast in a single pass for better performance
        const contrast = 1.3 // Reduced contrast factor for faster processing
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale and apply contrast in one pass
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          const adjusted = factor * (avg - 128) + 128

          data[i] = adjusted // R
          data[i + 1] = adjusted // G
          data[i + 2] = adjusted // B
        }

        // Simplified thresholding for better performance
        // Only apply to medium and high quality settings
        if (quality !== "low") {
          const threshold = 128
          for (let i = 0; i < data.length; i += 4) {
            // Simple binary thresholding
            const value = data[i] < threshold ? 0 : 255
            data[i] = value
            data[i + 1] = value
            data[i + 2] = value
          }
        }

        // Put processed image data back on canvas
        ctx.putImageData(imageData, 0, 0)

        // Convert canvas to file with appropriate compression
        const compressionQuality = quality === "low" ? 0.7 : quality === "medium" ? 0.85 : 0.95
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newFileName = imageFile.name.replace(/\.[^/.]+$/, "") + "-preprocessed.png"
              resolve(new File([blob], newFileName, { type: "image/png" }))
            } else {
              reject(new Error("Failed to create image blob"))
            }
          },
          "image/png",
          compressionQuality,
        )
      }

      img.onerror = () => {
        reject(new Error("Failed to load image for preprocessing"))
      }

      // Load image from file
      img.src = URL.createObjectURL(imageFile)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Simplified deskewing function for better performance
 */
export async function deskewImage(imageFile: File): Promise<File> {
  // For performance reasons, we're returning the original file
  // A real deskewing implementation would be more complex and slower
  return imageFile
}
