import { apiRequest } from './apiClient.js'

export async function getParticipants() {
  const data = await apiRequest('/participantsInfo')
  return Array.isArray(data) ? data : (data.data || [])
}

export async function getParticipant(id) {
  const data = await apiRequest(`/participantsInfo/${id}`)
  return data.data || data
}

export async function getParticipantByUserId(userId) {
  const data = await apiRequest(`/participantsInfo?utilisateurId=${userId}`)
  const participants = Array.isArray(data) ? data : (data.data || [])
  return participants.length > 0 ? participants[0] : null
}

export async function createParticipant(data) {
  return apiRequest('/participantsInfo', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateParticipant(id, data) {
  return apiRequest(`/participantsInfo/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export async function getParticipantStatus(id) {
  const data = await apiRequest(`/participantsInfo/${id}/statut`)
  return data.data || data
}
