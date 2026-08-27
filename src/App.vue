<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppBouton from '@/components/layout/AppBottomNav.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const auth = useAuthStore()
const route = useRoute()

const sidebarOpen = ref(false)

// MODIFICATION 1 : On ajoute la condition route.name !== 'not-found' pour forcer le mode plein écran isolé
const showLayout = computed(() => {
  return auth.isAuthenticated && 
         route.name !== 'login' && 
         route.name !== 'reset-password' && 
         route.name !== 'not-found'
})

// Fermer la sidebar quand on change de route (mobile)
watch(() => route.path, () => {
  sidebarOpen.value = false
})

// Lock body scroll when sidebar is open on mobile
watch(sidebarOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <!-- Toast et Confirm toujours présents -->
  <ToastContainer />
  <ConfirmDialog />

  <!-- Layout authentifié (avec sidebar + navbar) -->
  <div v-if="showLayout" class="h-screen w-full flex overflow-hidden">
    <AppSidebar :show="sidebarOpen" @close="closeSidebar" />

    <div class="main-container flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <AppNavbar @toggle-sidebar="toggleSidebar" />

      <!-- MODIFICATION 2 : Remplacement de pb-28 par pb-20 (la barre basse étant désormais ancrée et plus compacte) -->
      <main class="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 w-full bg-slate-50 space-y-8">
        <router-view />
      </main>

      <AppBouton />
    </div>
  </div>

  <!-- Layout non authentifié (login, reset-password, et maintenant not-found) -->
  <div v-else>
    <router-view />
  </div>
</template>
