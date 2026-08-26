<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useToast } from '@/composables/useToast.js'
import { getCotisations } from '@/services/cotisationService.js'
import { getEpargnes } from '@/services/epargneService.js'
import { getParticipants } from '@/services/participantService.js'
import { getConfiguration } from '@/services/configurationService.js'
import PageHeader from '@/components/ui/PageHeader.vue'

const auth = useAuthStore()
const { error: toastError } = useToast()

const loading = ref(true)
const flux = ref([])
const configuration = ref({ DATE_DEBUT_TONTINE: '2026-06-17' })

const filtreRecherche = ref('')
const filtreType = ref('all')
const filtreDateDebut = ref('')
const filtreDateFin = ref('')

const isParticipant = computed(() => auth.role === 'PARTICIPANT')

const fluxFiltres = computed(() => {
  let result = [...flux.value]

  if (isParticipant.value) {
    const participantId = auth.utilisateur?.participantInfoId
    if (participantId) {
      result = result.filter(f => f.participant_info_id === participantId)
    }
  }

  if (filtreRecherche.value) {
    const q = filtreRecherche.value.toLowerCase()
    result = result.filter(f =>
      (f.adherent || '').toLowerCase().includes(q)
    )
  }

  if (filtreType.value !== 'all') {
    result = result.filter(f => f.type === filtreType.value)
  }

  if (filtreDateDebut.value) {
    result = result.filter(f => f.date >= filtreDateDebut.value)
  }

  if (filtreDateFin.value) {
    result = result.filter(f => f.date <= filtreDateFin.value)
  }

  return result.sort((a, b) => new Date(b.date) - new Date(a.date))
})

const totalMontant = computed(() => {
  return fluxFiltres.value.reduce((sum, f) => sum + (f.montant || 0), 0)
})

const currentPage = ref(1)
const perPage = 15

const paginatedFlux = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return fluxFiltres.value.slice(start, start + perPage)
})

const totalPages = computed(() => Math.ceil(fluxFiltres.value.length / perPage))

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

function calculerSemaine(dateStr) {
  if (!dateStr) return '—'
  try {
    const dateDebut = new Date(configuration.value.DATE_DEBUT_TONTINE || '2026-06-17')
    const date = new Date(dateStr)
    const diffMs = date - dateDebut
    const diffSemaines = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
    return diffSemaines >= 0 ? `S${diffSemaines + 1}` : '—'
  } catch {
    return '—'
  }
}

async function chargerHistorique() {
  loading.value = true
  try {
    const [cotisationsData, epargnesData, participantsData, configData] = await Promise.allSettled([
      getCotisations(),
      getEpargnes(),
      getParticipants(),
      getConfiguration()
    ])

    const cotisations = cotisationsData.status === 'fulfilled' ? cotisationsData.value : []
    const epargnes = epargnesData.status === 'fulfilled' ? epargnesData.value : []
    const participants = participantsData.status === 'fulfilled' ? participantsData.value : []

    if (configData.status === 'fulfilled') {
      configuration.value = configData.value
    }

    const mapParticipants = {}
    participants.forEach(p => {
      const user = p.utilisateur || {}
      mapParticipants[p.id] = `${user.prenom || ''} ${user.nom || ''}`.trim()
    })

    const fluxListe = []

    cotisations.forEach(c => {
      fluxListe.push({
        id: c.id,
        type: 'cotisation',
        date: c.date_mercredi || c.date_cotisation || '',
        montant: Number(c.montant) || 0,
        adherent: mapParticipants[c.participant_info_id] || 'Inconnu',
        participant_info_id: c.participant_info_id,
        enregistree_par: c.enregistree_par_nom || 'Non renseigné',
        semaine: calculerSemaine(c.date_mercredi)
      })
    })

    epargnes.forEach(e => {
      fluxListe.push({
        id: e.id,
        type: 'epargne',
        date: e.date_epargne || '',
        montant: Number(e.montant) || 0,
        adherent: mapParticipants[e.participant_info_id] || 'Inconnu',
        participant_info_id: e.participant_info_id,
        enregistree_par: e.enregistree_par_nom || 'Non renseigné',
        semaine: calculerSemaine(e.date_epargne)
      })
    })

    flux.value = fluxListe
  } catch (e) {
    toastError('Erreur lors du chargement de l\'historique')
  } finally {
    loading.value = false
  }
}

function reinitialiserFiltres() {
  filtreRecherche.value = ''
  filtreType.value = 'all'
  filtreDateDebut.value = ''
  filtreDateFin.value = ''
  currentPage.value = 1
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

onMounted(chargerHistorique)
</script>

<template>
  <div class="space-y-6 max-w-[1400px] mx-auto font-sans">
    <PageHeader
      kicker="Comptabilité"
      title="Historique Général des Flux"
      subtitle="Consultez et filtrez l'ensemble des transactions financières enregistrées durant le cycle."
    />

    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <div class="h-20 bg-slate-200 rounded-3xl animate-pulse"></div>
      <div class="h-96 bg-slate-200 rounded-3xl animate-pulse"></div>
    </div>

    <template v-else>
      <!-- Filtres -->
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <!-- Recherche -->
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recherche libre</label>
            <input
              v-model="filtreRecherche"
              type="text"
              placeholder="Rechercher par membre, secrétaire..."
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          <!-- Type -->
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Type de versement</label>
            <select
              v-model="filtreType"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-emerald-500 focus:bg-white transition"
            >
              <option value="all">Tous les flux</option>
              <option value="cotisation">Cotisations</option>
              <option value="epargne">Épargnes</option>
            </select>
          </div>

          <!-- Date début -->
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Période du</label>
            <input
              v-model="filtreDateDebut"
              type="date"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          <!-- Date fin -->
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Au</label>
            <input
              v-model="filtreDateFin"
              type="date"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          <!-- Réinitialiser -->
          <div class="flex items-end">
            <button
              class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors flex items-center justify-center gap-2"
              @click="reinitialiserFiltres"
            >
              <i class="fa-solid fa-rotate-right"></i>
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <!-- Tableau -->
      <div class="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
              <th v-if="!isParticipant" class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adhérent</th>
              <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nature du flux</th>
              <th v-if="isParticipant" class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semaine</th>
              <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enregistré par</th>
              <th class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paginatedFlux.length === 0">
              <td :colspan="isParticipant ? 5 : 5" class="px-4 py-12 text-center text-sm text-slate-400">
                <i class="fas fa-clock-rotate-left text-4xl mb-2 block text-slate-300"></i>
                <p class="font-bold text-slate-500 mb-1">Aucune transaction trouvée</p>
                <p class="text-xs text-slate-400">Ajustez vos filtres pour voir plus de résultats.</p>
              </td>
            </tr>
            <tr
              v-for="row in paginatedFlux"
              :key="row.id"
              class="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
            >
              <td class="px-4 py-3 text-sm text-slate-600">{{ formatDate(row.date) }}</td>
              <td v-if="!isParticipant" class="px-4 py-3 text-sm font-medium text-slate-800">{{ row.adherent }}</td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
                    row.type === 'cotisation'
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-indigo-600 bg-indigo-50'
                  ]"
                >
                  <i :class="row.type === 'cotisation' ? 'fa-solid fa-hand-holding-dollar' : 'fa-solid fa-piggy-bank'"></i>
                  {{ row.type === 'cotisation' ? 'Cotisation' : 'Épargne' }}
                </span>
              </td>
              <td v-if="isParticipant" class="px-4 py-3 text-sm text-slate-600 font-medium">{{ row.semaine }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ row.enregistree_par }}</td>
              <td class="px-4 py-3 text-sm font-bold text-right" :class="row.type === 'cotisation' ? 'text-emerald-600' : 'text-indigo-600'">{{ row.montant?.toLocaleString('fr-FR') }} FCFA</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Footer pagination + total -->
      <div v-if="fluxFiltres.length > 0" class="mt-4 flex justify-between items-center border-t border-slate-100 pt-4">
        <span class="text-sm text-slate-500">
          {{ fluxFiltres.length }} transaction(s) — Total :
          <span class="font-bold text-slate-800">{{ totalMontant.toLocaleString('fr-FR') }} FCFA</span>
        </span>
        <div v-if="totalPages > 1" class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            :class="currentPage === 1 ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer'"
            :disabled="currentPage === 1"
            @click="prevPage"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <span class="text-xs font-bold text-slate-500">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            :class="currentPage === totalPages ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer'"
            :disabled="currentPage === totalPages"
            @click="nextPage"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
