<script setup>
import epargneImg from '@/assets/epargne.jpg'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const auth = useAuthStore()

const form = ref({
  loginIdentifier: '',
  password: ''
})
const errors = ref({})
const globalError = ref('')
const loading = ref(false)

function valider() {
  errors.value = {}
  globalError.value = ''

  if (!form.value.loginIdentifier.trim()) {
    errors.value.loginIdentifier = "L'identifiant ou le numéro de téléphone est obligatoire."
  }
  if (!form.value.password) {
    errors.value.password = "Le mot de passe est obligatoire."
  }

  return Object.keys(errors.value).length === 0
}

async function onSubmit() {
  if (!valider()) return

  loading.value = true
  try {
    await auth.login(form.value.loginIdentifier, form.value.password)
    router.push('/dashboard')
  } catch (e) {
    globalError.value = e.message || 'Identifiant ou mot de passe incorrect.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8 font-sans">
    <div class="max-w-5xl w-full bg-white rounded-[2.5rem] shadow-soft overflow-hidden flex flex-col md:flex-row">

      <!-- BLOC GAUCHE : Illustration & Message -->
      <div
  class="md:w-1/2 p-10 flex flex-col justify-between text-white relative min-h-[400px] md:min-h-[580px] overflow-hidden rounded-t-[2.5rem] md:rounded-tr-none md:rounded-l-[2.5rem] bg-cover bg-center"
  :style="{ backgroundImage: `url(${epargneImg})` }"
>
  <!-- Voile sombre pour garder le texte lisible par-dessus l'image -->
  <!-- <div class="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-emerald-950/70 to-slate-950/85"></div> -->

  <!-- CONTENU SUPERIEUR -->
  <div class="relative z-10">
          <div class="flex items-center space-x-3">
            <div class="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 text-emerald-400 text-lg border border-white/10 backdrop-blur-sm">
              <i class="fa-solid fa-wallet"></i>
            </div>
            <div>
              <h1 class="text-xl font-bold tracking-tight">Tonti<span class="text-emerald-400">Suivi</span></h1>
              <p class="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Tontine Numérique</p>
            </div>
          </div>

          <h2 class="text-3xl font-extrabold mt-16 leading-tight max-w-sm">
            Gérez votre tontine en toute confiance
          </h2>
        </div>

        <!-- CONTENU INFERIEUR -->
        <p class="text-xs leading-relaxed text-emerald-100/80 max-w-sm relative z-10 border-l-2 border-emerald-500 pl-4 py-1">
          Suivi transparent des cotisations hebdomadaires, de l'épargne personnelle, détection automatique des retards et bilan financier instantané. Fini le cahier papier !
        </p>
      </div>

      <!-- BLOC DROITE : Formulaire de Saisie -->
      <div class="md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white">
        <div class="mb-8">
          <h3 class="text-2xl font-black text-slate-900 tracking-tight">Se connecter</h3>
          <p class="text-slate-400 text-xs font-medium mt-1.5">Saisissez vos identifiants pour accéder à l'application.</p>
        </div>

        <form @submit.prevent="onSubmit" class="space-y-5">
          <!-- Identifiant -->
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Identifiant ou N° Téléphone</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <i class="fa-solid fa-user text-sm"></i>
              </span>
              <input
                v-model="form.loginIdentifier"
                type="text"
                class="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                placeholder="EX : Admin, responsable ou 771480102"
              >
            </div>
            <p v-if="errors.loginIdentifier" class="text-xs text-rose-500 font-semibold mt-1 pl-1">{{ errors.loginIdentifier }}</p>
          </div>

          <!-- Mot de passe -->
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mot de passe</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <i class="fa-solid fa-key text-sm"></i>
              </span>
              <input
                v-model="form.password"
                type="password"
                class="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                placeholder="••••••••••••"
              >
            </div>
            <p v-if="errors.password" class="text-xs text-rose-500 font-semibold mt-1 pl-1">{{ errors.password }}</p>
          </div>

          <!-- Erreur globale -->
          <div v-if="globalError" class="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 p-3.5 rounded-2xl text-center">
            {{ globalError }}
          </div>

          <!-- Bouton Se connecter -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-2xl transition-colors shadow-md shadow-emerald-600/10 flex items-center justify-center"
            >
              <i v-if="loading" class="fa-solid fa-spinner animate-spin mr-2"></i>
              {{ loading ? 'Connexion en cours...' : 'Se connecter' }}
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</template>
