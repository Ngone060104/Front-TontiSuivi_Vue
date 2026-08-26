import { apiRequest } from './apiClient.js'

export async function getConfiguration() {
  const data = await apiRequest('/configuration')
  return data.data || data
}
