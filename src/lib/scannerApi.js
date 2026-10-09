/*
 * scannerApi.js
 * Sends an ingredient label photo to the "scan-label" Edge Function,
 * which asks Gemini about it. Same rule as the other api files:
 * throws an Error with a readable message if anything fails.
 */
import { supabase } from './supabase.js'

// Phone photos are often 3-10 MB. Shrinking them first makes the upload
// fast, and labels stay readable at this size.
const MAX_SIDE = 1600

/**
 * Shrink an image file and turn it into base64 text (how images travel in JSON).
 * Returns: { image, mimeType }
 */
async function prepareImage(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // e.g. HEIC photos from iPhones in browsers that can't open them
    throw new Error("Couldn't open that image. Try a JPG or PNG photo.")
  }

  // Scale down so the longest side is at most MAX_SIDE (never scale up)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  )

  // FileReader gives "data:image/jpeg;base64,AAAA..."; keep only the part after the comma
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error("Couldn't read that image."))
    reader.readAsDataURL(blob)
  })

  return { image: dataUrl.split(',')[1], mimeType: 'image/jpeg' }
}

/**
 * Scan a label photo against the user's unsafe foods.
 * Returns: {
 *   readable,          false if Gemini couldn't find a readable ingredient list
 *   ingredients,       every ingredient it read
 *   matches,           [{ ingredient, allergen, synonym }]
 *   allergensChecked,  the unsafe foods it compared against
 * }
 */
export async function scanLabel(file) {
  const body = await prepareImage(file)

  // invoke() sends the logged-in user's token automatically
  const { data, error } = await supabase.functions.invoke('scan-label', { body })

  if (error) {
    // For errors the function sent itself, its message is in the response body
    let message = error.message
    try {
      const details = await error.context.json()
      if (details?.error) message = details.error
    } catch {
      // No readable body (e.g. no internet): keep the general message
    }
    throw new Error(message)
  }

  return data
}
