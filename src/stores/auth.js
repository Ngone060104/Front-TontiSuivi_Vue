import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tentativeConnexion, deconnexion, recupererSession } from '@/services/authService.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const utilisateur = computed(() => user.value)
  const role = computed(() => user.value?.role?.nom || null)

  function restoreSession() {
    const savedUser = recupererSession()
    const savedToken = localStorage.getItem('token')

    if (savedUser && savedToken) {
      user.value = savedUser
      token.value = savedToken
      return true
    }

    return false
  }

  async function login(identifiant, password) {
    loading.value = true
    try {
      const loggedUser = await tentativeConnexion(identifiant, password)
      user.value = loggedUser
      token.value = localStorage.getItem('token')
      return loggedUser
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    // Clear local state first so the router guard sees unauthenticated immediately
    localStorage.removeItem('token')
    localStorage.removeItem('userConnected')
    localStorage.removeItem('currentPage')
    user.value = null
    token.value = null

    // Then notify server (fire and forget — local state is already clean)
    try {
      await deconnexion()
    } catch {
      // Ignore server errors — session is already destroyed locally
    }
  }

  // Restaurer la session au démarrage si possible
  restoreSession()

  return {
    user,
    token,
    loading,
    isAuthenticated,
    utilisateur,
    role,
    login,
    logout,
    restoreSession
  }
})
