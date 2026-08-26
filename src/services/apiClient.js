const API_BASE_URL = import.meta.env.VITE_API_URL

function getToken() {
  return localStorage.getItem('token')
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken()

  const headers = {
    ...options.headers
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
  const error = new Error(data.message || 'Erreur serveur')
  error.status = response.status
  error.data = data
  throw error
}

  return data
}

export async function apiUpload(endpoint, formData, method = 'POST') {
  const token = getToken()

  const headers = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: formData
  })

  if (!response.ok) {
    let errorMessage = 'Erreur serveur'
    try {
      const data = await response.json()
      errorMessage = data.message || errorMessage
    } catch {
      // Si le corps n'est pas du JSON
    }
    throw new Error(errorMessage)
  }

  return response.json()
}
