<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// On filtre et adapte les éléments du menu pour le format mobile condensé
const bottomMenuItems = computed(() => {
  const role = auth.role
  const items = []

  // 1. Accueil / Dashboard
  items.push({
    icon: 'fa-solid fa-house', // Remplacé par une icône Home classique
    route: '/dashboard',
    name: 'dashboard'
  })

  // 2. Section "Favoris / Actions secondaires" (Ici Membres par exemple)
  if (['ADMIN', 'SECRETAIRE', 'RESPONSABLE'].includes(role)) {
    items.push({
      icon: 'fa-solid fa-users',
      route: '/membres',
      name: 'membres'
    })
  }

  // 3. Le bouton central "+" (Action principale : Saisie ou Historique selon les droits)
  // On lui donne un flag spécial pour le styliser en gros bouton bleu au centre
  items.push({
    icon: 'fa-solid fa-plus',
    route: role === 'RESPONSABLE' ? '/saisie-cotisation' : '/historique',
    name: role === 'RESPONSABLE' ? 'saisie-cotisation' : 'historique',
    isCentral: true
  })

  // 4. Historique ou autre flux (si pas déjà au centre)
  if (role === 'RESPONSABLE') {
    items.push({
      icon: 'fa-solid fa-clock-rotate-left',
      route: '/historique',
      name: 'historique'
    })
  } else if (role === 'ADMIN') {
    // Remplissage pour garder une structure symétrique
    items.push({
      icon: 'fa-solid fa-clock-rotate-left',
      route: '/historique',
      name: 'historique'
    })
  }

  // 5. Profil / Configuration
  items.push({
    icon: role === 'ADMIN' ? 'fa-solid fa-gear' : 'fa-solid fa-user',
    route: role === 'ADMIN' ? '/configuration' : '/dashboard',
    name: role === 'ADMIN' ? 'configuration' : 'profil'
  })

  return items
})

function isActive(itemName) {
  return route.name === itemName
}

function naviguerVers(path) {
  router.push(path)
}
</script>

<template>
  <!-- MODIFICATION ICI : md:hidden au lieu de lg:hidden pour masquer la barre dès le format tablette -->
  <div class="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 md:hidden">
    <nav class="flex items-center justify-between w-full max-w-md bg-white border border-slate-200/80 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] px-4 py-2 h-20">
      
      <template v-for="(item, index) in bottomMenuItems" :key="index">
        
        <!-- Bouton Central "+" -->
        <button 
          v-if="item.isCentral"
          @click="naviguerVers(item.route)"
          class="flex items-center justify-center w-10 h-10 bg-[#4f46e5] text-white rounded-full shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform cursor-pointer -mt-1"
        >
          <i :class="[item.icon, 'text-xl']"></i>
        </button>

        <!-- Boutons de Navigation Standard -->
        <button 
          v-else
          @click="naviguerVers(item.route)"
          :class="[
            'flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 relative cursor-pointer',
            isActive(item.name) ? 'bg-indigo-50 text-[#4f46e5]' : 'text-slate-400 hover:text-slate-600'
          ]"
        >
          <i :class="[item.icon, 'text-lg']"></i>
          
          <!-- Indicateur visuel discret si actif (optionnel) -->
          <span v-if="isActive(item.name)" class="absolute bottom-1 w-1 h-1 bg-[#4f46e5] rounded-full"></span>
        </button>

      </template>

    </nav>
  </div>
</template>
