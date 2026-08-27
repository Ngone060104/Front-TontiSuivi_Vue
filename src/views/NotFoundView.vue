<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function retournerAccueil() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
    <div class="text-center max-w-md space-y-6">
      
      <!-- Icône ou Illustration -->
      <div class="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-[#4f46e5] text-3xl border border-indigo-100 shadow-sm animate-bounce">
        <i class="fa-solid fa-compass-slash"></i>
      </div>

      <!-- Textes d'erreur -->
      <div class="space-y-2">
        <h1 class="text-6xl font-extrabold text-slate-900 tracking-tight">404</h1>
        <h2 class="text-xl font-bold text-slate-800">Page introuvable</h2>
        <p class="text-sm text-slate-500 leading-relaxed">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée. Vérifiez l'URL ou retournez au tableau de bord.
        </p>
      </div>

      <!-- Bouton d'action -->
      <div>
        <button
          @click="retournerAccueil"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#4f46e5] text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-[#4338ca] active:scale-95 transition-all cursor-pointer"
        >
          <i class="fa-solid fa-arrow-left"></i>
          <span>Retour au Tableau de Bord</span>
        </button>
      </div>

    </div>
  </div>
</template>
