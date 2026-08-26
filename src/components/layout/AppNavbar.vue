<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

defineEmits(['toggleSidebar'])

const pageTitles = {
  'dashboard': 'Tableau de Bord',
  'membres': 'Membres',
  'saisie-cotisation': 'Saisie des cotisations',
  'historique': 'Comptabilité',
  'configuration': 'Gestion des Comptes',
  'reset-password': 'Réinitialisation'
}

const pageTitle = computed(() => {
  return pageTitles[router.currentRoute.value.name] || 'Tableau de Bord — TontiSuivi'
})

const userInitials = computed(() => {
  const user = auth.utilisateur
  if (!user) return '?'
  const p = (user.prenom || '').charAt(0).toUpperCase()
  const n = (user.nom || '').charAt(0).toUpperCase()
  return p + n
})

const roleLabel = computed(() => {
  return auth.utilisateur?.role?.label || auth.role || ''
})

const userPhoto = computed(() => {
  return auth.utilisateur?.photo || null
})

function goToResetPassword() {
  router.push('/reset-password')
}

function onGlobalSearch(e) {
  window.dispatchEvent(new CustomEvent('tontiSearch', { detail: e.target.value.toLowerCase().trim() }))
}
</script>

<template>
  <header class="h-20 w-full bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 font-sans">
    <div class="flex items-center gap-4">
      <button
        class="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        @click="$emit('toggleSidebar')"
      >
        <i class="fa-solid fa-bars"></i>
      </button>
      <h2 class="text-sm md:text-xl font-bold text-slate-800 tracking-tight whitespace-nowrap">{{ pageTitle }}</h2>
    </div>

    <div class="hidden sm:block flex-1 max-w-xs md:max-w-xl mx-4 md:mx-8">
      <div class="relative w-full">
        <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
          <i class="fa-solid fa-magnifying-glass text-sm"></i>
        </span>
        <input
          type="text"
          placeholder="rechercher --"
          class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          @input="onGlobalSearch"
        />
      </div>
    </div>

    <div class="flex items-center gap-3">
      <div class="hidden sm:block text-right">
        <p class="text-sm font-semibold text-slate-800 leading-tight">
          {{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }}
        </p>
        <p class="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">ESPACE {{ roleLabel }}</p>
      </div>

      <img
        v-if="userPhoto"
        :src="userPhoto"
        :alt="auth.utilisateur?.prenom"
        class="h-10 w-10 rounded-full object-cover border-2 border-emerald-200 shadow-sm flex-shrink-0"
      />
      <div
        v-else
        class="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm tracking-wider flex-shrink-0"
      >
        {{ userInitials }}
      </div>

      <button
        class="h-9 w-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center justify-center border border-blue-200 flex-shrink-0 cursor-pointer"
        title="Changer mon mot de passe"
        @click="goToResetPassword"
      >
        <i class="fa-solid fa-key text-sm"></i>
      </button>
    </div>
  </header>
</template>
