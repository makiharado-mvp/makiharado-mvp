'use client'

const MAX_LONG_EDGE = 1600
const JPEG_QUALITY = 0.8

// HEIC/HEIF cannot be decoded by the Canvas API natively in most browsers.
// These files are returned unchanged; the server validates their size.
const SKIP_COMPRESSION_EXTS = new Set(['heic', 'heif'])

/**
 * Resizes and re-encodes an image file as JPEG using the Canvas API.
 *
 * - Images whose long edge exceeds MAX_LONG_EDGE are scaled down proportionally.
 * - Output is always JPEG at JPEG_QUALITY, regardless of input format.
 * - HEIC/HEIF files are returned as-is (no native Canvas decoder).
 * - If createImageBitmap() fails (unsupported format), the original is returned
 *   unchanged so the server can still validate it.
 *
 * Throws if canvas.toBlob() returns null (e.g. Canvas context lost).
 */
export async function compressImage(file: File): Promise<File> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (SKIP_COMPRESSION_EXTS.has(ext)) {
    // No native browser decoder — upload original, server validates size
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Unrecognised format or browser limitation — skip compression
    console.warn('[compressImage] createImageBitmap failed, skipping compression:', file.name)
    return file
  }

  const { width, height } = bitmap
  const longEdge = Math.max(width, height)
  const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1
  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error(`Canvas context unavailable while compressing "${file.name}"`)
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close()

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error(`Compression failed for "${file.name}" — canvas.toBlob returned null`))
          return
        }
        const baseName = file.name.replace(/\.[^.]+$/, '')
        resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}
