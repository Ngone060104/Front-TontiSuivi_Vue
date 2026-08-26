import { apiRequest } from './apiClient.js'

export async function getEpargnes() {
  const data = await apiRequest('/epargnes')
  return Array.isArray(data) ? data : (data.data || [])
}

export async function getEpargnesByParticipant(participantInfoId) {
  const data = await apiRequest(`/epargnes?participantInfoId=${participantInfoId}`)
  return Array.isArray(data) ? data : (data.data || [])
}

export async function getEpargne(id) {
  const data = await apiRequest(`/epargnes/${id}`)
  return data.data || data
}

export async function createEpargne(donnees) {
  return apiRequest('/epargnes', {
    method: 'POST',
    body: JSON.stringify(donnees)
  })
}

export async function updateEpargne(id, donnees) {
  return apiRequest(`/epargnes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(donnees)
  })
}
