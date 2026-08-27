<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// État pour afficher/masquer le menu de déconnexion
const showProfileMenu = ref(false)

const bottomMenuItems = computed(() => {
  const role = auth.role
  const items = []

  // 1. Accueil / Dashboard
  items.push({
    icon: 'fa-solid fa-house',
    route: '/dashboard',
    name: 'dashboard'
  })

  // 2. Membres
  if (['ADMIN', 'SECRETAIRE', 'RESPONSABLE'].includes(role)) {
    items.push({
      icon: 'fa-solid fa-users',
      route: '/membres',
      name: 'membres'
    })
  }

  // 3. Bouton central "+"
  items.push({
    icon: 'fa-solid fa-plus',
    route: role === 'RESPONSABLE' ? '/saisie-cotisation' : '/historique',
    name: role === 'RESPONSABLE' ? 'saisie-cotisation' : 'historique',
    isCentral: true
  })

  // 4. Historique
  if (role === 'RESPONSABLE' || role === 'ADMIN') {
    items.push({
      icon: 'fa-solid fa-clock-rotate-left',
      route: '/historique',
      name: 'historique'
    })
  }

  // 5. Profil / Configuration
  items.push({
    icon: 'fa-solid fa-user',
    name: 'profil',
    isProfile: true
  })

  return items
})

function isActive(itemName) {
  return route.name === itemName
}

function naviguerVers(path) {
  showProfileMenu.value = false
  router.push(path)
}

function handleProfileClick() {
  showProfileMenu.value = !showProfileMenu.value
}

async function deconnexion() {
  showProfileMenu.value = false
  await auth.logout()
  router.push('/login')
}

// Fermer le menu si on clique en dehors
function closeMenu(e) {
  if (!e.target.closest('.profile-menu-container')) {
    showProfileMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', closeMenu))
onUnmounted(() => document.removeEventListener('click', closeMenu))
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 z-50 w-full md:hidden profile-menu-container">
    <div class="relative w-full flex flex-col items-center">
      
      <!-- Mini Menu Profil / Déconnexion Flottant -->
      <transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="transform scale-95 opacity-0 translate-y-2"
        enter-to-class="transform scale-100 opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="transform scale-100 opacity-100 translate-y-0"
        leave-to-class="transform scale-95 opacity-0 translate-y-2"
      >
        <div v-if="showProfileMenu" class="absolute bottom-18 right-4 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-1 z-50 flex flex-col font-sans">
          <!-- Option Configuration (uniquement pour l'ADMIN) -->
          <button 
            v-if="auth.role === 'ADMIN'"
            @click="naviguerVers('/configuration')"
            class="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left w-full"
          >
            <i class="fa-solid fa-gear text-slate-400 text-sm"></i>
            <span>Configuration</span>
          </button>
          
          <!-- Option Déconnexion (pour tout le monde) -->
          <button 
            @click="deconnexion"
            class="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50/50 transition-colors cursor-pointer text-left w-full"
          >
            <i class="fa-solid fa-right-from-bracket text-sm"></i>
            <span>Déconnexion</span>
          </button>
        </div>
      </transition>

      <!-- Barre de navigation principale native -->
      <nav class="flex items-center justify-between w-full bg-white border-t border-slate-200/80 rounded-t-3xl shadow-[0_-8px_24px_rgb(0,0,0,0.04)] px-6 pt-1 pb-5 h-16">
        <template v-for="(item, index) in bottomMenuItems" :key="index">
          
          <!-- Bouton Central "+" Modifié en Vert Émeraude -->
          <button 
            v-if="item.isCentral"
            @click="naviguerVers(item.route)"
            class="flex items-center justify-center w-11 h-11 bg-emerald-500 text-white rounded-full shadow-md shadow-emerald-500/20 active:scale-95 transition-transform cursor-pointer -mt-5"
          >
            <i :class="[item.icon, 'text-base']"></i>
          </button>

          <!-- Bouton Spécial Profil Modifié en Vert Émeraude -->
          <button 
            v-else-if="item.isProfile"
            @click="handleProfileClick"
            :class="[
              'flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 relative cursor-pointer',
              showProfileMenu || isActive('configuration') ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            ]"
          >
            <i :class="[item.icon, 'text-sm']"></i>
            <span v-if="isActive('configuration')" class="absolute bottom-1 w-0.5 h-0.5 bg-emerald-600 rounded-full"></span>
          </button>

          <!-- Boutons de Navigation Standard Modifiés en Vert Émeraude -->
          <button 
            v-else
            @click="naviguerVers(item.route)"
            :class="[
              'flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 relative cursor-pointer',
              isActive(item.name) ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            ]"
          >
            <i :class="[item.icon, 'text-sm']"></i>
            <span v-if="isActive(item.name)" class="absolute bottom-1 w-0.5 h-0.5 bg-emerald-600 rounded-full"></span>
          </button>

        </template>
      </nav>

    </div>
  </div>
</template>

<style scoped>
nav {
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
}
</style>
