// Supported image MIME types
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'image/tiff',
  'image/gif',
  'image/bmp',
  'image/x-icon',
  'image/avif',
  'image/heic',
  'image/heif',
]

// Maximum file size in bytes (1MB)
const MAX_FILE_SIZE = 1024 * 1024

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate image file type and size
 */
export function validateImageFile(file: File): ValidationResult {
  // Check MIME type
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported format. Allowed: JPG, PNG, SVG, WebP, TIFF, GIF, BMP, ICO, AVIF, HEIC, HEIF`,
    }
  }

  // Check file size (soft limit - we'll try to compress if over)
  if (file.size > MAX_FILE_SIZE * 10) {
    // 10MB absolute max
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 10MB`,
    }
  }

  return { valid: true }
}

/**
 * Convert SVG file to Base64 data URL
 */
export async function svgToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read SVG file'))
      }
    }

    reader.onerror = () => reject(new Error('Error reading SVG file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Resize image to target size (square) and convert to Base64
 */
export async function resizeImageToBase64(
  file: File,
  targetSize: number = 96,
  initialQuality: number = 0.9,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas')
          canvas.width = targetSize
          canvas.height = targetSize
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Calculate dimensions for center-cropped square
          const sourceSize = Math.min(img.width, img.height)
          const sourceX = (img.width - sourceSize) / 2
          const sourceY = (img.height - sourceSize) / 2

          // Draw image (cropped to square, centered)
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            targetSize,
            targetSize,
          )

          // Export to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', initialQuality)
          resolve(dataUrl)
        } catch (error) {
          reject(new Error('Failed to process image'))
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))

      if (typeof e.target?.result === 'string') {
        img.src = e.target.result
      }
    }

    reader.onerror = () => reject(new Error('Error reading file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compress image by reducing quality
 */
export async function compressImage(
  dataUrl: string,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0)
        const compressed = canvas.toDataURL('image/jpeg', quality)
        resolve(compressed)
      } catch (error) {
        reject(new Error('Failed to compress image'))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = dataUrl
  })
}

/**
 * Process image file with progressive compression if needed
 */
export async function processImageFile(
  file: File,
  targetSize: number = 96,
): Promise<string> {
  // Validation
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Handle SVG separately (no resizing)
  if (file.type === 'image/svg+xml') {
    return await svgToBase64(file)
  }

  // Resize bitmap image
  let dataUrl = await resizeImageToBase64(file, targetSize, 0.9)

  // Check size and compress if needed
  const maxBase64Size = 150 * 1024 // 150KB target
  let currentSize = estimateBase64Size(dataUrl)

  // Progressive compression
  const qualityLevels = [0.85, 0.8, 0.75, 0.7, 0.65, 0.6]

  for (const quality of qualityLevels) {
    if (currentSize <= maxBase64Size) break

    dataUrl = await compressImage(dataUrl, quality)
    currentSize = estimateBase64Size(dataUrl)
  }

  // If still too large, reduce dimensions
  if (currentSize > maxBase64Size && targetSize > 48) {
    const reducedSize = Math.max(48, Math.floor(targetSize * 0.75))
    dataUrl = await resizeImageToBase64(file, reducedSize, 0.7)
  }

  return dataUrl
}

/**
 * Estimate Base64 string size in bytes
 */
export function estimateBase64Size(dataUrl: string): number {
  // Remove data URL prefix
  const base64String = dataUrl.split(',')[1] || dataUrl

  // Each Base64 character is ~0.75 bytes
  return Math.ceil((base64String.length * 3) / 4)
}

/**
 * Get available localStorage space
 */
export function getAvailableLocalStorage(): number {
  try {
    let totalSize = 0
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        const item = localStorage.getItem(key)
        if (item) {
          totalSize += item.length + key.length
        }
      }
    }

    // Assume 5MB quota (conservative estimate)
    const quotaBytes = 5 * 1024 * 1024
    return quotaBytes - totalSize
  } catch {
    return 0
  }
}

/**
 * Check if adding data would exceed localStorage quota
 */
export function wouldExceedQuota(additionalSize: number): boolean {
  const available = getAvailableLocalStorage()
  return additionalSize > available
}
