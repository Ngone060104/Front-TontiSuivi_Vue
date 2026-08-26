<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { changerMotDePasse } from '@/services/userService.js'

const router = useRouter()
const auth = useAuthStore()

onMounted(() => {
  if (!auth.isAuthenticated) {
    router.push('/login')
  }
})

const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const errors = ref({})
const globalError = ref('')
const globalSuccess = ref('')
const loading = ref(false)
const disabled = ref(false)

function valider() {
  errors.value = {}
  globalError.value = ''

  if (!form.value.oldPassword.trim()) {
    errors.value.oldPassword = "L'ancien mot de passe est obligatoire"
  }

  if (!form.value.newPassword.trim()) {
    errors.value.newPassword = 'Le nouveau mot de passe est obligatoire'
  } else if (form.value.newPassword.length < 6) {
    errors.value.newPassword = 'Le mot de passe doit contenir au moins 6 caractères'
  }

  if (form.value.newPassword !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Les mots de passe ne correspondent pas'
  }

  return Object.keys(errors.value).length === 0
}

async function onSubmit() {
  if (!valider()) {
    globalError.value = 'Veuillez corriger les erreurs ci-dessus.'
    return
  }

  loading.value = true
  globalError.value = ''
  globalSuccess.value = ''
  try {
    await changerMotDePasse(form.value.oldPassword, form.value.newPassword)
    globalSuccess.value = '✅ Votre mot de passe a été changé avec succès !'
    disabled.value = true
    setTimeout(() => {
      router.push('/dashboard')
    }, 3000)
  } catch (e) {
    globalError.value = e.message || 'Erreur lors du changement de mot de passe.'
  } finally {
    loading.value = false
  }
}

function onCancel() {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8 font-sans">
    <div class="max-w-md w-full bg-white rounded-[2.5rem] shadow-soft p-10">

      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-2xl shadow-lg shadow-emerald-500/20">
          <i class="fa-solid fa-key"></i>
        </div>
        <h1 class="text-2xl font-black text-slate-800 mt-3">Tonti<span class="text-emerald-500">Suivi</span></h1>
        <p class="text-sm text-slate-400 font-medium">Réinitialisation du mot de passe</p>
      </div>

      <!-- Formulaire -->
      <form @submit.prevent="onSubmit" class="space-y-5">

        <!-- Ancien mot de passe -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ancien mot de passe *</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <i class="fa-solid fa-lock text-sm"></i>
            </span>
            <input
              v-model="form.oldPassword"
              type="password"
              class="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              placeholder="Entrez votre ancien mot de passe"
            >
          </div>
          <p v-if="errors.oldPassword" class="text-xs text-rose-500 font-semibold mt-1">{{ errors.oldPassword }}</p>
        </div>

        <!-- Nouveau mot de passe -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nouveau mot de passe *</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <i class="fa-solid fa-key text-sm"></i>
            </span>
            <input
              v-model="form.newPassword"
              type="password"
              class="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              placeholder="Entrez votre nouveau mot de passe"
            >
          </div>
          <p v-if="errors.newPassword" class="text-xs text-rose-500 font-semibold mt-1">{{ errors.newPassword }}</p>
        </div>

        <!-- Confirmer le mot de passe -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirmer le mot de passe *</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <i class="fa-solid fa-check-double text-sm"></i>
            </span>
            <input
              v-model="form.confirmPassword"
              type="password"
              class="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              placeholder="Confirmez votre nouveau mot de passe"
            >
          </div>
          <p v-if="errors.confirmPassword" class="text-xs text-rose-500 font-semibold mt-1">{{ errors.confirmPassword }}</p>
        </div>

        <!-- Erreur globale -->
        <div v-if="globalError" class="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 p-3.5 rounded-2xl text-center">
          {{ globalError }}
        </div>

        <!-- Succès -->
        <div v-if="globalSuccess" class="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-center">
          {{ globalSuccess }}
        </div>

        <!-- Boutons -->
        <div class="space-y-3 pt-2">
          <button
            type="submit"
            :disabled="loading || disabled"
            :class="disabled
              ? 'w-full py-3.5 px-4 bg-emerald-100 text-emerald-700 cursor-default text-sm font-bold rounded-2xl transition-colors flex items-center justify-center'
              : 'w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-2xl transition-colors shadow-md shadow-emerald-600/10 flex items-center justify-center'"
          >
            <i v-if="loading" class="fa-solid fa-spinner animate-spin mr-2"></i>
            {{ disabled ? 'Mot de passe changé !' : (loading ? 'Traitement en cours...' : 'Changer le mot de passe') }}
          </button>
          <button
            type="button"
            @click="onCancel"
            class="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-2xl transition-colors flex items-center justify-center"
          >
            <i class="fa-solid fa-arrow-left mr-2"></i>
            Retour à la connexion
          </button>
        </div>
      </form>

    </div>
  </div>
</template>
