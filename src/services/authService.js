import { apiRequest } from './apiClient.js'

const LABELS_ROLES = {
  ADMIN: 'Administrateur',
  RESPONSABLE: 'Responsable Caisse',
  SECRETAIRE: 'Secrétaire',
  PARTICIPANT: 'Participant'
}

function construireUtilisateurAvecRole(user) {
  return {
    ...user,
    role: {
      nom: user.role_id,
      label: LABELS_ROLES[user.role_id] || user.role_id
    }
  }
}

export async function tentativeConnexion(identifiant, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifiant, password })
  })

  const user = construireUtilisateurAvecRole(data.user || data.utilisateur)

  localStorage.setItem('token', data.token)
  localStorage.setItem('userConnected', JSON.stringify(user))

  return user
}

export async function deconnexion() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' })
  } catch (error) {
    console.error('Erreur lors de la déconnexion côté serveur :', error)
  }

  localStorage.removeItem('token')
  localStorage.removeItem('userConnected')
  localStorage.removeItem('currentPage')
}

export function recupererSession() {
  const userData = localStorage.getItem('userConnected')
  if (!userData) return null

  try {
    return JSON.parse(userData)
  } catch {
    return null
  }
}
