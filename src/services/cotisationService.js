import { apiRequest } from './apiClient.js'

export async function getCotisations() {
  const data = await apiRequest('/cotisations')
  return Array.isArray(data) ? data : (data.data || [])
}

export async function getCotisationsByParticipant(participantInfoId) {
  const data = await apiRequest(`/cotisations?participantInfoId=${participantInfoId}`)
  return Array.isArray(data) ? data : (data.data || [])
}

export async function createCotisation(donnees) {
  return apiRequest('/cotisations', {
    method: 'POST',
    body: JSON.stringify(donnees)
  })
}
