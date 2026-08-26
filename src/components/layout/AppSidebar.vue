<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const emit = defineEmits(['close'])

const props = defineProps({
  show: { type: Boolean, default: false }
})

const menuItems = computed(() => {
  const role = auth.role
  const items = []

  items.push({ label: 'Dashboard', icon: 'fas fa-dashboard', route: '/dashboard', name: 'dashboard' })

  if (['ADMIN', 'SECRETAIRE', 'RESPONSABLE'].includes(role)) {
    items.push({ label: 'Membres / Participants', icon: 'fa-solid fa-users', route: '/membres', name: 'membres' })
  }

  if (role === 'RESPONSABLE') {
    items.push({ label: 'Saisie des cotisations', icon: 'fa-solid fa-dollar-sign', route: '/saisie-cotisation', name: 'saisie-cotisation' })
  }

  items.push({ label: 'Historiques des flux', icon: 'fa-solid fa-clock-rotate-left', route: '/historique', name: 'historique' })

  if (role === 'ADMIN') {
    items.push({ label: 'Configuration & comptes', icon: 'fa-solid fa-gear', route: '/configuration', name: 'configuration' })
  }

  return items
})

function isActive(itemName) {
  return route.name === itemName
}

function naviguerVers(path) {
  router.push(path)
  emit('close')
}

async function deconnexion() {
  emit('close')
  await auth.logout()
  router.push('/login')
}

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
})
function handleEsc(e) {
  if (e.key === 'Escape' && props.show) {
    emit('close')
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 z-40 lg:hidden"
    @click="$emit('close')"
  ></div>

  <aside
    :class="[
      'w-72 min-h-screen bg-[#0f172a] text-white flex flex-col justify-between py-4 pl-4 font-sans border-r border-slate-800 z-50 flex-shrink-0',
      'fixed inset-y-0 left-0 lg:relative transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none',
      show ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <div>
      <div class="flex items-center gap-3 pr-4 mb-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 text-lg border border-emerald-500/20">
          <i class="fa-solid fa-wallet"></i>
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Tonti<span class="text-emerald-500">Suivi</span>
          </h1>
        </div>
        <button
          class="ml-auto lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          @click="$emit('close')"
        >
          <i class="fa-solid fa-xmark text-white/60"></i>
        </button>
      </div>

      <nav class="mt-15 space-y-3 pr-4">
        <button
          v-for="item in menuItems"
          :key="item.name"
          :class="[
            'flex items-center space-x-3 w-full px-4 py-3 rounded-l-full text-sm font-semibold transition-all group cursor-pointer',
            isActive(item.name)
              ? 'bg-white text-emerald-600'
              : 'text-slate-300 hover:bg-white hover:text-emerald-600'
          ]"
          @click="naviguerVers(item.route)"
        >
          <i :class="[item.icon, 'text-base transition-colors flex-shrink-0', isActive(item.name) ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600']"></i>
          <span class="whitespace-nowrap">{{ item.label }}</span>
        </button>
      </nav>
    </div>

    <div class="pt-4 pr-4 border-t border-slate-800">
      <button
        class="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm font-semibold cursor-pointer"
        @click="deconnexion"
      >
        <i class="fa-solid fa-right-from-bracket text-base"></i>
        <span>Déconnexion</span>
      </button>
    </div>
  </aside>
</template>