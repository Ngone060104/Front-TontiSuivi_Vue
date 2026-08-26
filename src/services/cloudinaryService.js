import { CLOUDINARY_CONFIG } from '@/config/cloudinary.js'

export async function uploadImageToCloudinary(imageFile) {
  const formData = new FormData()
  formData.append('file', imageFile)
  formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET)

  const response = await fetch(CLOUDINARY_CONFIG.UPLOAD_URL, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error("Erreur lors de l'upload de l'image")
  }

  const data = await response.json()
  return data.secure_url
}
