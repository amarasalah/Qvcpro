const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export function isCloudinaryConfigured() {
  return !!(CLOUD_NAME && UPLOAD_PRESET)
}

export async function uploadImage(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary non configuré. Ajoutez VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'qvc-quality')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  )

  if (!response.ok) {
    throw new Error('Échec de l\'upload Cloudinary.')
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
