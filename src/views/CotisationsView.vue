<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useToast } from '@/composables/useToast.js'
import { getParticipants, getParticipantStatus } from '@/services/participantService.js'
import { getCotisationsByParticipant, createCotisation } from '@/services/cotisationService.js'
import { getEpargnesByParticipant, createEpargne, updateEpargne } from '@/services/epargneService.js'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import CotisationForm from '@/components/forms/CotisationForm.vue'
import EpargneForm from '@/components/forms/EpargneForm.vue'

const auth = useAuthStore()
const { success, error: toastError } = useToast()

const MONTANT_COTISATION = 200
const ITEMS_PAR_PAGE = 4

const loading = ref(true)
const membres = ref([])
const tousLesMembres = ref([])
const recherche = ref('')
const pageActuelle = ref(1)

const showVersementModal = ref(false)
const participantSelectionne = ref(null)
const versementLoading = ref(false)
const historiqueCotisations = ref([])
const historiqueEpargnes = ref([])

const showEditEpargneModal = ref(false)
const epargneSelectionne = ref(null)
const editEpargneLoading = ref(false)
const editEpargneParticipantName = ref('')
const editEpargneParticipantId = ref(null)

const totalPages = computed(() => Math.ceil(tousLesMembres.value.length / ITEMS_PAR_PAGE))

const debutIndex = computed(() => (pageActuelle.value - 1) * ITEMS_PAR_PAGE)
const finIndex = computed(() => Math.min(debutIndex.value + ITEMS_PAR_PAGE, tousLesMembres.value.length))
const membresPagines = computed(() => tousLesMembres.value.slice(debutIndex.value, finIndex.value))

const historiqueMerged = computed(() => {
  const items = []
  historiqueCotisations.value.forEach(c => {
    if (c.statutCotisation === 'PAYEE') {
      items.push({
        type: 'cotisation',
        id: c.id,
        montant: Number(c.montant || 0),
        date: c.date_mercredi || c.date_cotisation,
        label: 'Cotisation',
        modifiable: false
      })
    }
  })
  historiqueEpargnes.value.forEach(e => {
    items.push({
      type: 'epargne',
      id: e.id,
      montant: Number(e.montant || 0),
      date: e.date_Epargne || e.date_epargne || e.date,
      label: 'Épargne',
      modifiable: true,
      original: e
    })
  })
  items.sort((a, b) => new Date(b.date) - new Date(a.date))
  return items.slice(0, 8)
})

function pagePrecedente() {
  if (pageActuelle.value > 1) {
    pageActuelle.value--
  }
}

function pageSuivante() {
  if (pageActuelle.value < totalPages.value) {
    pageActuelle.value++
  }
}

function allerPage(page) {
  pageActuelle.value = page
}

function onRecherche() {
  const q = recherche.value.toLowerCase().trim()
  const resultats = membres.value.filter(m => {
    const nomComplet = (m.nomComplet || '').toLowerCase()
    const tel = m.telephone || ''
    return nomComplet.includes(q) || tel.includes(q)
  })
  tousLesMembres.value = resultats
  pageActuelle.value = 1
}

async function chargerParticipants() {
  loading.value = true
  try {
    const participantsData = await getParticipants()
    const membresEnrichis = await Promise.all(participantsData.map(async (participant) => {
      let retard = 0
      let totalCotisation = 0
      let totalEpargne = 0
      try {
        const [cotisations, epargnes, statutResult] = await Promise.allSettled([
          getCotisationsByParticipant(participant.id),
          getEpargnesByParticipant(participant.id),
          getParticipantStatus(participant.id)
        ])
        if (cotisations.status === 'fulfilled') {
          totalCotisation = cotisations.value.reduce((s, c) => s + Number(c.montant || 0), 0)
          participant.cotisations = cotisations.value
        }
        if (epargnes.status === 'fulfilled') {
          totalEpargne = epargnes.value.reduce((s, e) => s + Number(e.montant || 0), 0)
          participant.epargnes = epargnes.value
        }
        if (statutResult.status === 'fulfilled') {
          retard = statutResult.value.retards || 0
        }
      } catch {}
      const user = participant.utilisateur || {}
      return {
        ...participant,
        nomComplet: (user.prenom || user.nom) ? `${user.prenom || ''} ${user.nom || ''}`.trim() : 'Adhérent',
        telephone: user.telephone || '',
        email: user.email || '',
        initiales: (user.prenom || user.nom) ? `${(user.prenom || '')[0] || ''}${(user.nom || '')[0] || ''}` : 'AD',
        retard,
        totalCotisation,
        totalEpargne
      }
    }))
    membres.value = membresEnrichis
    tousLesMembres.value = membresEnrichis
  } catch (e) {
    toastError("Impossible de charger l'espace responsable")
  } finally {
    loading.value = false
  }
}

function ouvrirVersement(participant) {
  participantSelectionne.value = participant
  showVersementModal.value = true
  chargerHistorique(participant.id)
}

async function chargerHistorique(participantId) {
  try {
    const [cotisations, epargnes] = await Promise.allSettled([
      getCotisationsByParticipant(participantId),
      getEpargnesByParticipant(participantId)
    ])
    historiqueCotisations.value = (cotisations.status === 'fulfilled' ? cotisations.value : [])
      .filter(c => c.statutCotisation === 'PAYEE')
    historiqueEpargnes.value = epargnes.status === 'fulfilled' ? epargnes.value : []
  } catch {
  }
}

async function onVersementSubmit(data) {
  versementLoading.value = true
  try {
    const promises = []

    if (data.inclureCotisation) {
      promises.push(createCotisation({
        participant_info_id: participantSelectionne.value.id,
        date_mercredi: data.date_mercredi,
        montant: data.montant,
        heure: new Date().toTimeString().slice(0, 5)
      }))
    }

    if (data.inclureEpargne && data.montantEpargne > 0) {
      promises.push(createEpargne({
        participant_info_id: participantSelectionne.value.id,
        date_epargne: data.date_mercredi,
        montant: data.montantEpargne
      }))
    }

    await Promise.all(promises)
    success('Versement enregistré avec succès !')
    const pid = participantSelectionne.value.id
    showVersementModal.value = false
    participantSelectionne.value = null
    await chargerHistorique(pid)
    await chargerParticipants()
  } catch (e) {
    toastError("Erreur lors de l'enregistrement: " + (e.message || ''))
  } finally {
    versementLoading.value = false
  }
}

function ouvrirEditEpargne(epargne) {
  editEpargneParticipantName.value = participantSelectionne.value?.nomComplet || ''
  editEpargneParticipantId.value = participantSelectionne.value?.id || null
  showVersementModal.value = false
  epargneSelectionne.value = epargne.original || epargne
  setTimeout(() => {
    showEditEpargneModal.value = true
  }, 300)
}

async function onEditEpargneSubmit(data) {
  editEpargneLoading.value = true
  try {
    await updateEpargne(epargneSelectionne.value.id, data)
    success("L'épargne a été modifiée avec succès !")
    showEditEpargneModal.value = false
    if (editEpargneParticipantId.value) {
      await chargerHistorique(editEpargneParticipantId.value)
    }
    await chargerParticipants()
  } catch (e) {
    toastError("Erreur lors de la modification: " + (e.message || ''))
  } finally {
    editEpargneLoading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Date inconnue'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
}

function getNom(row) {
  const user = row.utilisateur || {}
  return `${user.prenom || ''} ${user.nom || ''}`.trim()
}

onMounted(chargerParticipants)
</script>

<template>
  <div class="space-y-6 max-w-[1400px] mx-auto animate-fadeIn">
    <PageHeader
      kicker="Saisie des cotisations"
      title="Enregistrement d'un versement"
      subtitle="Sélectionnez un membre pour enregistrer sa cotisation ou son épargne"
    />

    <!-- ===== SECTION 1: RECHERCHE MEMBRE ===== -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        <i class="fa-solid fa-magnifying-glass mr-2"></i>
        1. Sélectionner un membre
      </p>
      <div class="relative">
        <i class="fa-solid fa-search absolute left-4 top-3.5 text-slate-400"></i>
        <input
          v-model="recherche"
          type="text"
          placeholder="Rechercher par nom, prénom, N° téléphone"
          class="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-emerald-500 focus:bg-white transition"
          @input="onRecherche"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="i in 4" :key="i" class="h-48 bg-slate-200 rounded-2xl animate-pulse"></div>
    </div>

    <!-- ===== LISTE DES MEMBRES (CARDS) ===== -->
    <div v-else-if="membresPagines.length > 0">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="m in membresPagines"
          :key="m.id"
          class="bg-white rounded-2xl border-2 p-5 cursor-pointer hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
          :class="m.retard === 0 ? 'border-emerald-200 hover:border-emerald-400' : 'border-rose-200 hover:border-rose-400'"
          @click="ouvrirVersement(m)"
        >
          <!-- Bandeau de couleur en haut -->
          <div
            class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
            :class="m.retard === 0 ? 'from-emerald-500 to-emerald-700' : 'from-rose-500 to-rose-700'"
          ></div>

          <!-- ===== EN-TÊTE CARTE ===== -->
          <div class="flex items-center gap-4 mt-1">
            <div
              class="h-14 w-14 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0"
              :class="m.retard === 0 ? 'from-emerald-500 to-emerald-700' : 'from-rose-500 to-rose-700'"
            >
              {{ m.initiales }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-slate-800 text-base truncate">{{ m.nomComplet }}</h3>
              <div class="flex items-center gap-2 mt-0.5">
                <p class="text-xs text-slate-400 flex items-center gap-1">
                  <i class="fa-solid fa-phone text-[10px]"></i>
                  {{ m.telephone }}
                </p>
              </div>
            </div>
          </div>

          <!-- ===== BADGE STATUT ===== -->
          <div class="mt-3 flex justify-end">
            <span v-if="m.retard === 0" class="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-bold">
              <i class="fa-solid fa-circle-check"></i>
              À jour
            </span>
            <span v-else class="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1 rounded-full text-[10px] font-bold">
              <i class="fa-solid fa-circle-exclamation"></i>
              {{ m.retard }} retard{{ m.retard > 1 ? 's' : '' }}
            </span>
          </div>

          <!-- ===== STATISTIQUES FINANCIÈRES ===== -->
          <div class="grid grid-cols-2 gap-3 mt-4">
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-hand-holding-dollar text-emerald-500 text-xs"></i>
                <p class="text-[9px] uppercase text-slate-400 font-bold">Cotisations</p>
              </div>
              <p class="font-bold text-slate-700 text-base mt-0.5">
                {{ m.totalCotisation.toLocaleString('fr-FR') }} FCFA
              </p>
            </div>
            <div class="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-piggy-bank text-emerald-600 text-xs"></i>
                <p class="text-[9px] uppercase text-emerald-600 font-bold">Épargne</p>
              </div>
              <p class="font-bold text-emerald-700 text-base mt-0.5">
                {{ m.totalEpargne.toLocaleString('fr-FR') }} FCFA
              </p>
            </div>
          </div>

          <!-- ===== BOUTON AJOUTER ===== -->
          <button
            class="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-bold transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2"
            @click.stop="ouvrirVersement(m)"
          >
            <i class="fa-solid fa-plus-circle"></i>
            Ajouter cotisation
          </button>
        </div>
      </div>

      <!-- ===== PAGINATION ===== -->
      <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-6">
        <div class="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          <button
            class="px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition text-sm font-medium"
            :class="{ 'opacity-50 cursor-not-allowed': pageActuelle <= 1 }"
            :disabled="pageActuelle <= 1"
            @click="pagePrecedente"
          >
            <i class="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button
            v-for="p in totalPages"
            :key="p"
            class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition"
            :class="p === pageActuelle ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'"
            @click="allerPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition text-sm font-medium"
            :class="{ 'opacity-50 cursor-not-allowed': pageActuelle >= totalPages }"
            :disabled="pageActuelle >= totalPages"
            @click="pageSuivante"
          >
            <i class="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
        <span class="text-xs text-slate-400 font-medium ml-2">
          {{ debutIndex + 1 }} - {{ finIndex }} sur {{ tousLesMembres.length }}
        </span>
      </div>
    </div>

    <!-- État vide -->
    <div v-else class="col-span-full text-center py-16">
      <i class="fa-solid fa-users-slash text-4xl text-slate-300"></i>
      <p class="mt-3 text-slate-400 font-bold">Aucun membre trouvé</p>
    </div>

    <!-- Modale Versement -->
    <AppModal
      :show="showVersementModal"
      :title="participantSelectionne ? `Membre : ${participantSelectionne.nomComplet}` : 'Versement'"
      icon="fa-solid fa-hand-holding-dollar"
      iconClass="bg-emerald-100 text-emerald-600"
      :confirmLabel="false"
      @close="showVersementModal = false"
    >
      <CotisationForm
        :participant="participantSelectionne"
        :loading="versementLoading"
        @submit="onVersementSubmit"
        @cancel="showVersementModal = false"
      >
        <template #before-actions>
          <div class="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
            <p class="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
              <i class="fa-solid fa-clock-rotate-left mr-2"></i>
              Versements de l'adhérent
            </p>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <div v-if="historiqueMerged.length === 0" class="text-center text-slate-400 text-sm py-4">
                Aucun versement enregistré
              </div>
              <div
                v-for="item in historiqueMerged"
                :key="item.type + '-' + item.id"
                class="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-100"
              >
                <div class="flex items-center gap-3">
                  <span
                    class="h-8 w-8 rounded-full flex items-center justify-center text-xs"
                    :class="item.type === 'epargne' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'"
                  >
                    <i class="fa-solid" :class="item.type === 'epargne' ? 'fa-piggy-bank' : 'fa-hand-holding-dollar'"></i>
                  </span>
                  <div>
                    <p class="font-bold text-slate-700 text-sm">{{ item.type === 'epargne' ? 'Épargne' : 'Cotisation' }}</p>
                    <p class="text-[10px] text-slate-400">Semaine du {{ formatDate(item.date) }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <p class="font-black text-sm" :class="item.type === 'epargne' ? 'text-emerald-600' : 'text-blue-600'">
                    {{ item.montant.toLocaleString('fr-FR') }} FCFA
                  </p>
                  <button
                    v-if="item.modifiable"
                    class="text-slate-400 hover:text-amber-600 transition-colors"
                    title="Modifier l'épargne"
                    @click.stop="ouvrirEditEpargne(item)"
                  >
                    <i class="fa-solid fa-pen text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </CotisationForm>
    </AppModal>

    <!-- Modale Édition Épargne -->
    <AppModal
      :show="showEditEpargneModal"
      title="Modifier l'épargne"
      icon="fa-solid fa-pen-to-square"
      iconClass="bg-amber-100 text-amber-600"
      :confirmLabel="false"
      @close="showEditEpargneModal = false"
    >
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p class="text-xs text-amber-700 flex items-center gap-2">
          <i class="fa-solid fa-pen-to-square text-amber-500"></i>
          Modification de l'épargne de <strong>{{ editEpargneParticipantName }}</strong>
        </p>
      </div>
      <EpargneForm
        :epargne="epargneSelectionne"
        :loading="editEpargneLoading"
        @submit="onEditEpargneSubmit"
        @cancel="showEditEpargneModal = false"
      />
    </AppModal>
  </div>
</template>