import { apiRequest, apiUpload } from './apiClient.js'

export async function inscrireNouveauMembre(donneesUtilisateur, donneesParticipant) {
  const formData = new FormData()

  for (const key in donneesUtilisateur) {
    if (donneesUtilisateur[key] !== undefined && donneesUtilisateur[key] !== null) {
      formData.append(key, donneesUtilisateur[key])
    }
  }

  const utilisateur = await apiUpload('/utilisateurs', formData)

  const participantData = {
    utilisateur_id: utilisateur.id,
    adresse: donneesParticipant.notes || '',
    date_inscription: donneesParticipant.date_inscription || new Date().toISOString().split('T')[0]
  }

  const participant = await apiRequest('/participantsInfo', {
    method: 'POST',
    body: JSON.stringify(participantData)
  })

  return { utilisateur, participant }
}

export async function recupererTousLesUtilisateurs() {
  const data = await apiRequest('/utilisateurs?expand=role')
  return Array.isArray(data) ? data : (data.data || [])
}

export async function recupererUtilisateur(id) {
  const data = await apiRequest(`/utilisateurs/${id}`)
  return data.data || data
}

export async function creerUtilisateur(donnees) {
  const formData = new FormData()

  for (const key in donnees) {
    if (donnees[key] !== undefined && donnees[key] !== null) {
      formData.append(key, donnees[key])
    }
  }

  return apiUpload('/utilisateurs', formData)
}

export async function modifierUtilisateur(id, donnees) {
  const formData = new FormData()

  for (const key in donnees) {
    if (donnees[key] !== undefined && donnees[key] !== null) {
      formData.append(key, donnees[key])
    }
  }

  return apiUpload(`/utilisateurs/${id}`, formData, 'PATCH')
}

export async function basculerEtatCompte(userId, nouvelEtat) {
  const formData = new FormData()
  formData.append('actif', nouvelEtat)
  return apiUpload(`/utilisateurs/${userId}`, formData, 'PATCH')
}

export async function reinitialiserMotDePasse(userId, newPassword) {
  return apiRequest(`/utilisateurs/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword })
  })
}

// ✅ Corrigé : appelle /auth/change-password, sans ID dans l'URL —
// le backend identifie l'utilisateur via son token JWT (route réservée
// au changement de SON PROPRE mot de passe, avec vérification de l'ancien).
export async function changerMotDePasse(oldPassword, newPassword) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword })
  })
}