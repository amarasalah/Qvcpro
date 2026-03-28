const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET

export function isCloudinaryConfigured() {
  return !!(CLOUD_NAME && API_KEY && API_SECRET)
}

/**
 * Generate a SHA-1 hash signature for Cloudinary signed uploads.
 * Uses the Web Crypto API (available in all modern browsers).
 */
async function generateSignature(params) {
  // Sort params and build the string to sign
  const sortedKeys = Object.keys(params).sort()
  const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join('&')

  // Encode the string + api secret
  const encoder = new TextEncoder()
  const data = encoder.encode(stringToSign + API_SECRET)

  // SHA-1 hash
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function uploadImage(file) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error('Cloudinary non configuré. Vérifiez les variables VITE_CLOUDINARY_*.')
  }

  const timestamp = Math.round(Date.now() / 1000)

  const params = {
    timestamp,
    folder: 'qvc-quality',
  }

  const signature = await generateSignature(params)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', API_KEY)
  formData.append('timestamp', timestamp)
  formData.append('signature', signature)
  formData.append('folder', 'qvc-quality')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Échec de l\'upload Cloudinary.')
  }

  const data = await response.json()

  return {
    url: data.secure_url,
    publicId: data.public_id,
    thumbnail: data.secure_url.replace('/upload/', '/upload/c_thumb,w_200,h_200/'),
    width: data.width,
    height: data.height,
    uploadedAt: new Date().toISOString(),
  }
}
