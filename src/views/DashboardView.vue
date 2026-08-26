<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useToast } from '@/composables/useToast.js'
import { recupererTousLesUtilisateurs } from '@/services/userService.js'
import { getParticipants } from '@/services/participantService.js'
import { getCotisations } from '@/services/cotisationService.js'
import { getEpargnes } from '@/services/epargneService.js'
import { getConfiguration } from '@/services/configurationService.js'
import { getParticipantStatus, getParticipantByUserId } from '@/services/participantService.js'
import { getCotisationsByParticipant as getCotisationsParticipant } from '@/services/cotisationService.js'
import { getEpargnesByParticipant as getEpargnesParticipant } from '@/services/epargneService.js'
import PageHeader from '@/components/ui/PageHeader.vue'

const router = useRouter()
const auth = useAuthStore()
const { error: toastError } = useToast()

const loading = ref(true)
const isVisible = ref(false)

const utilisateurs = ref([])
const participants = ref([])
const cotisations = ref([])
const epargnes = ref([])
const configuration = ref({ DATE_DEBUT_TONTINE: '2026-06-17' })

const participantInfo = ref(null)
const statutParticipant = ref(null)
const membresAJour = ref(0)
const membresEnRetard = ref(0)

const isParticipant = computed(() => auth.role === 'PARTICIPANT')

const espaceLabel = computed(() => {
  const nomRole = auth.role
  if (nomRole === 'SECRETAIRE') return 'Espace de gestion de la Secrétariat'
  if (nomRole === 'RESPONSABLE') return 'Espace de gestion de la Responsable de Caisse'
  return 'Espace de gestion des administrateurs'
})

const dateCreationFormatted = computed(() => {
  if (!auth.utilisateur?.date_creation) return ''
  return new Date(auth.utilisateur.date_creation).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
})

const stats = computed(() => {
  const users = utilisateurs.value
  const sommeCotisations = cotisations.value.reduce((sum, c) => sum + (Number(c.montant) || 0), 0)
  const sommeEpargnes = epargnes.value.reduce((sum, e) => sum + (Number(e.montant) || 0), 0)
  return {
    totalParticipants: participants.value.length,
    totalSecretaires: users.filter(u => u.role?.nom === 'SECRETAIRE').length,
    totalResponsables: users.filter(u => u.role?.nom === 'RESPONSABLE').length,
    totalAdmins: users.filter(u => u.role?.nom === 'ADMIN').length,
    totalComptes: users.length,
    comptesActifs: users.filter(u => u.actif === true).length,
    comptesSuspendus: users.filter(u => u.actif === false).length,
    membresAJour: membresAJour.value,
    membresEnRetard: membresEnRetard.value,
    montantGlobal: sommeCotisations + sommeEpargnes,
    totalEpargnes: sommeEpargnes,
    fondsCommun: sommeCotisations
  }
})

function getParticipantName(participantInfoId) {
  const p = participants.value.find(p => p.id === participantInfoId)
  if (!p) return 'Membre Tontine'
  const u = utilisateurs.value.find(u => u.id === p.utilisateur_id)
  return u ? `${u.prenom} ${u.nom}` : 'Membre Tontine'
}

const dernieresOperations = computed(() => {
  const ops = []

  cotisations.value.forEach(c => {
    ops.push({
      type: 'COTISATION',
      label: 'Cotisation Hebdomadaire',
      icon: 'fa-solid fa-hand-holding-dollar',
      color: 'text-cyan-600 bg-cyan-50',
      date: c.date_mercredi,
      montant: c.montant,
      participant: getParticipantName(c.participant_info_id)
    })
  })

  epargnes.value.forEach(e => {
    ops.push({
      type: 'EPARGNE',
      label: 'Dépôt Épargne Perso',
      icon: 'fa-solid fa-piggy-bank',
      color: 'text-indigo-600 bg-indigo-50',
      date: e.date_epargne,
      montant: e.montant,
      participant: getParticipantName(e.participant_info_id)
    })
  })

  return ops
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4)
})

const statsParticipant = computed(() => {
  if (!participantInfo.value || !cotisations.value.length) {
    return { totalEpargne: 0, totalCotisations: 0, capitalCumule: 0 }
  }

  const mesCotisations = cotisations.value.filter(
    c => c.participant_info_id === participantInfo.value.id
  )
  const mesEpargnes = epargnes.value.filter(
    e => e.participant_info_id === participantInfo.value.id
  )

  const totalCotisations = mesCotisations.reduce((sum, c) => sum + (Number(c.montant) || 0), 0)
  const totalEpargne = mesEpargnes.reduce((sum, e) => sum + (Number(e.montant) || 0), 0)

  return {
    totalCotisations,
    totalEpargne,
    capitalCumule: totalCotisations + totalEpargne
  }
})

const pastilles = computed(() => {
  if (!participantInfo.value) return []

  const dateInsc = new Date(participantInfo.value.date_inscription)
  dateInsc.setHours(0, 0, 0, 0)
  const aujourd = new Date()
  aujourd.setHours(0, 0, 0, 0)
  const diffJours = Math.floor((aujourd - dateInsc) / (24 * 60 * 60 * 1000))
  const nbSemaines = Math.floor(diffJours / 7) + 1

  const datesManquantes = statutParticipant.value?.datesManquantes || []

  const datesCotisees = cotisations.value
    .filter(c => c.participant_info_id === participantInfo.value.id)
    .map(c => c.date_mercredi)

  const result = []
  for (let semaine = 1; semaine <= nbSemaines; semaine++) {
    const dateSemaine = new Date(dateInsc)
    dateSemaine.setDate(dateSemaine.getDate() + (semaine - 1) * 7)
    const dateStr = dateSemaine.toISOString().split('T')[0]
    const dateAffichage = new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

    const estPaye = datesCotisees.includes(dateStr)
    const estManquant = datesManquantes.includes(dateStr)

    let statut = 'NON ÉCHU'
    let statusText = 'NON ÉCHU'

    if (estPaye) {
      statut = 'PAID'
      statusText = 'PAYÉ'
    } else if (estManquant) {
      statut = 'MISSING'
      statusText = 'RETARD'
    }

    result.push({
      week: semaine,
      date: dateStr,
      statut,
      label: `S${semaine}`,
      dateAffichage,
      statusText
    })
  }

  return result
})

function actionPrincipale() {
  if (auth.role === 'RESPONSABLE') {
    router.push('/saisie-cotisation')
  } else {
    router.push('/membres')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

async function chargerDonnees() {
  loading.value = true
  try {
    if (isParticipant.value) {
      const userId = auth.utilisateur?.id
      if (userId) {
        participantInfo.value = await getParticipantByUserId(userId)

        if (participantInfo.value) {
          const [cotisationsData, epargnesData, configData, statut] = await Promise.allSettled([
            getCotisationsParticipant(participantInfo.value.id),
            getEpargnesParticipant(participantInfo.value.id),
            getConfiguration(),
            getParticipantStatus(participantInfo.value.id)
          ])

          if (cotisationsData.status === 'fulfilled') cotisations.value = cotisationsData.value
          if (epargnesData.status === 'fulfilled') epargnes.value = epargnesData.value
          if (configData.status === 'fulfilled') configuration.value = configData.value
          if (statut.status === 'fulfilled') statutParticipant.value = statut.value
        }
      }
    } else {
      const [usersData, participantsData, cotisationsData, epargnesData, configData] = await Promise.allSettled([
        recupererTousLesUtilisateurs(),
        getParticipants(),
        getCotisations(),
        getEpargnes(),
        getConfiguration()
      ])

      if (usersData.status === 'fulfilled') utilisateurs.value = usersData.value
      if (participantsData.status === 'fulfilled') participants.value = participantsData.value
      if (cotisationsData.status === 'fulfilled') cotisations.value = cotisationsData.value
      if (epargnesData.status === 'fulfilled') epargnes.value = epargnesData.value
      if (configData.status === 'fulfilled') configuration.value = configData.value

      const statsDelai = { aJour: 0, enRetard: 0 }
      for (const p of participants.value) {
        try {
          const statutResult = await getParticipantStatus(p.id)
          if (statutResult.statut === 'A_JOUR') statsDelai.aJour++
          else statsDelai.enRetard++
        } catch (e) {
          statsDelai.enRetard++
        }
      }
      membresAJour.value = statsDelai.aJour
      membresEnRetard.value = statsDelai.enRetard
    }
  } catch (e) {
    toastError('Erreur lors du chargement du tableau de bord')
    console.error(e)
  } finally {
    loading.value = false
    await nextTick()
    isVisible.value = true
  }
}

onMounted(chargerDonnees)
</script>

<template>
  <div :class="['space-y-10 font-sans max-w-[1400px] mx-auto transition-opacity duration-300', isVisible ? 'opacity-100' : 'opacity-0']" id="dashboard-wrapper">
    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <div class="h-32 bg-slate-200 rounded-3xl animate-pulse"></div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="h-28 bg-slate-200 rounded-3xl animate-pulse"></div>
      </div>
    </div>

    <!-- Dashboard Admin / Secrétaire / Responsable -->
    <template v-else-if="!isParticipant">
      <PageHeader
        :kicker="espaceLabel"
        title="Suivi Global - Cycle Epargne 2026"
        subtitle="Suivez en temps réel les cotisations obligatoires du mercredi et les épargnes personnelles de tous les membres de la Tontine."
        :actionLabel="auth.role === 'RESPONSABLE' ? 'Saisir un versement' : 'Inscrire un participant'"
        :actionIcon="auth.role === 'RESPONSABLE' ? 'fa-solid fa-coins' : 'fa-solid fa-user-plus'"
        @action="actionPrincipale"
      />

      <!-- Section 1: Statistiques Globales des Comptes & Rôles Système -->
      <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200">
        <div class="space-y-4">
          <h3 class="text-sm font-black text-slate-900 tracking-widest flex items-center uppercase">
            <span class="h-1.5 w-1.5 rounded-full bg-indigo-500 mr-2"></span>
            Statistiques Globales des Comptes & Rôles Système
          </h3>
          <hr>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Participants -->
            <div class="bg-white p-6 rounded-3xl border-t-[4px] border-t-indigo-900 border-x border-b border-slate-100 shadow-soft flex items-center justify-between transition-transform hover:scale-[1.01]">
              <div>
                <h2 class="text-slate-400 text-sm font-semibold">Participants</h2>
                <p class="text-3xl font-black text-slate-800 mt-1">{{ stats.totalParticipants }}</p>
                <p class="text-[10px] text-slate-400 font-medium mt-1">Membres enregistrés</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center text-base shadow-lg shadow-slate-900/10">
                <i class="fa-solid fa-users"></i>
              </div>
            </div>

            <!-- Secrétaire -->
            <div class="bg-white p-5 rounded-2xl border-t-[4px] border-t-cyan-400 border-x border-b border-slate-100 flex items-center justify-between transition-transform hover:scale-[1.01] shadow-soft">
              <div>
                <h4 class="text-slate-400 text-sm font-semibold">Secrétaire</h4>
                <p class="text-3xl font-black text-slate-800 mt-1">{{ stats.totalSecretaires }}</p>
                <p class="text-[10px] text-slate-400 font-medium mt-1">Inscriptions & fiches</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-user-pen"></i>
              </div>
            </div>

            <!-- Total comptes -->
            <div class="bg-white p-5 rounded-2xl border-t-[4px] border-t-rose-500 border-x border-b border-slate-100 flex items-center justify-between transition-transform hover:scale-[1.01] shadow-soft">
              <div>
                <h4 class="text-slate-400 text-sm font-semibold">Totals Comptes Users</h4>
                <p class="text-3xl font-black text-slate-800 mt-1">{{ stats.totalComptes }}</p>
                <p class="text-[10px] font-medium mt-1 text-slate-400">
                  <span class="text-emerald-500 font-bold">{{ stats.comptesActifs }} actifs</span> — <span class="text-rose-500 font-bold">{{ stats.comptesSuspendus }} suspendus</span>
                </p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center text-base">
                <i class="fa-solid fa-id-card"></i>
              </div>
            </div>

            <!-- Responsable -->
            <div class="bg-white p-5 rounded-2xl border-t-[4px] border-t-emerald-500 border-x border-b border-slate-100 flex items-center justify-between transition-transform hover:scale-[1.01] shadow-soft">
              <div>
                <h4 class="text-slate-400 text-sm font-semibold">Responsable Caisse</h4>
                <p class="text-3xl font-black text-slate-800 mt-1">{{ stats.totalResponsables }}</p>
                <p class="text-[10px] text-slate-400 font-medium mt-1">Saisie des versements</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-user-tie"></i>
              </div>
            </div>

            <!-- Admin -->
            <div class="bg-white p-5 rounded-2xl border-t-[4px] border-t-violet-500 border-x border-b border-slate-100 flex items-center justify-between transition-transform hover:scale-[1.01] shadow-soft">
              <div>
                <h4 class="text-slate-400 text-sm font-semibold">Administrateurs</h4>
                <p class="text-3xl font-black text-slate-800 mt-1">{{ stats.totalAdmins }}</p>
                <p class="text-[10px] text-slate-400 font-medium mt-1">Droits système complets</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-unlock-keyhole"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Statistiques Globales du Fond -->
      <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200">
        <div class="space-y-4">
          <h3 class="text-sm font-black text-slate-900 tracking-widest flex items-center uppercase">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2"></span>
            Statistiques Globales du Fond
          </h3>
          <hr>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Montant global -->
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex items-center justify-between transition-transform hover:scale-[1.01]">
              <div>
                <h4 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Montant Global Collecté</h4>
                <p class="text-2xl font-black text-slate-800 mt-2">{{ stats.montantGlobal.toLocaleString('fr-FR') }} FCFA</p>
                <p class="text-[11px] text-slate-400 font-medium mt-1">Épargne + Cotisations Communes</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-arrow-trend-up"></i>
              </div>
            </div>

            <!-- Total épargnes -->
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex items-center justify-between transition-transform hover:scale-[1.01]">
              <div>
                <h4 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Épargnes</h4>
                <p class="text-2xl font-black text-slate-800 mt-2">{{ stats.totalEpargnes.toLocaleString('fr-FR') }} FCFA</p>
                <p class="text-[11px] text-slate-400 font-medium mt-1">Multiples de 1 000 FCFA</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-wallet"></i>
              </div>
            </div>

            <!-- Fonds commun -->
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex items-center justify-between transition-transform hover:scale-[1.01]">
              <div>
                <h4 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Fonds Commun Obligatoire</h4>
                <p class="text-2xl font-black text-slate-800 mt-2">{{ stats.fondsCommun.toLocaleString('fr-FR') }} FCFA</p>
                <p class="text-[11px] text-slate-400 font-medium mt-1">200 FCFA / membre chaque mercredi</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-hand-holding-dollar"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Statut & Dernières Opérations -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <!-- Statut des Adhérents -->
        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex flex-col justify-between">
          <div>
            <h3 class="text-base font-black text-slate-800 tracking-tight mb-6">Statut des Adhérents</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-2xl">
                <div class="flex items-center space-x-3.5">
                  <div class="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm flex-shrink-0">
                    <i class="fa-solid fa-user-check"></i>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-800">Membres à jour</h4>
                    <p class="text-[10px] text-emerald-600 font-medium mt-0.5">Aucune Cotisation Manquante</p>
                  </div>
                </div>
                <span class="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-extrabold">{{ stats.membresAJour }}</span>
              </div>
              <div class="flex items-center justify-between p-3.5 bg-rose-50/40 border border-rose-100 rounded-2xl">
                <div class="flex items-center space-x-3.5">
                  <div class="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm flex-shrink-0">
                    <i class="fa-solid fa-user-clock"></i>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-800">Membres en Retard</h4>
                    <p class="text-[10px] text-rose-600 font-medium mt-0.5">Relance téléphonique requise</p>
                  </div>
                </div>
                <span class="h-8 w-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-extrabold">{{ stats.membresEnRetard }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Dernières Opérations -->
        <div class="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex flex-col justify-between min-h-[260px]">
          <div>
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-base font-black text-slate-800 tracking-tight">Dernières Opérations</h3>
              <button
                class="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                @click="router.push('/historique')"
              >
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>Voir tout l'historique</span>
              </button>
            </div>
            <div v-if="dernieresOperations.length === 0" class="py-4">
              <p class="text-slate-400 text-xs font-medium">Aucun versement enregistré sur ce cycle.</p>
            </div>
            <div v-else class="divide-y divide-slate-50 overflow-hidden">
              <div
                v-for="(op, i) in dernieresOperations"
                :key="i"
                class="flex items-center justify-between py-3 font-sans transition-colors hover:bg-slate-50/50 px-2 rounded-xl"
              >
                <div class="flex items-center space-x-3">
                  <div :class="[op.color, 'h-9 w-9 rounded-xl flex items-center justify-center text-xs flex-shrink-0']">
                    <i :class="op.icon"></i>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-slate-800">{{ op.participant }}</h4>
                    <p class="text-[10px] text-slate-400 font-medium mt-0.5">{{ op.label }} — {{ formatDate(op.date) }}</p>
                  </div>
                </div>
                <span class="text-xs font-extrabold text-slate-800">+ {{ op.montant?.toLocaleString('fr-FR') }} F</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Dashboard Participant -->
    <template v-else>
      <div class="space-y-8 font-sans max-w-[1200px] mx-auto">
        <!-- Profil -->
        <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-soft">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                <i class="fa-regular fa-circle-user mr-1"></i>
                Mon Profil Tontine
              </p>
              <h1 class="text-2xl font-black text-slate-800 mt-1">
                Bonjour, {{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }} !
              </h1>
              <p class="text-sm text-slate-400 mt-1">
                <i class="fa-solid fa-phone mr-1"></i>{{ auth.utilisateur?.telephone }} •
                <i class="fa-regular fa-calendar ml-2 mr-1"></i>Membre depuis le {{ dateCreationFormatted }}
              </p>
            </div>
            <div class="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold border-2 border-emerald-200 flex-shrink-0">
              {{ (auth.utilisateur?.prenom || '').charAt(0) }}{{ (auth.utilisateur?.nom || '').charAt(0) }}
            </div>
          </div>
        </div>

        <!-- Statut -->
        <div v-if="statutParticipant"
          class="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div :class="[
              'h-10 w-10 rounded-full flex items-center justify-center text-lg',
              statutParticipant.statut === 'A_JOUR' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            ]">
              <i :class="statutParticipant.statut === 'A_JOUR' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
            </div>
            <div>
              <h3 class="text-sm font-black text-slate-900">
                Situations : {{ statutParticipant.statut === 'A_JOUR' ? '✅ À Jour !' : '⚠️ En Retard !' }}
              </h3>
              <p class="text-sm text-slate-500">
                {{ statutParticipant.statut === 'A_JOUR'
                    ? 'Toutes vos cotisations communes obligatoires sont payées.'
                    : 'Vous avez des cotisations en retard. Veuillez régulariser votre situation.' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Stats personnelles -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Mon Épargne Personnelle -->
          <div class="bg-white p-6 rounded-3xl border-t-[4px] border-t-emerald-500 border-x border-b border-slate-100 shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Mon Épargne Personnelle</h4>
                <p class="text-2xl font-black text-slate-800 mt-2">{{ statsParticipant.totalEpargne.toLocaleString('fr-FR') }} FCFA</p>
                <p class="text-[11px] text-slate-400 font-medium mt-1">Votre épargne libre sécurisée</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-piggy-bank"></i>
              </div>
            </div>
          </div>
          <!-- Mes Cotisations Communes -->
          <div class="bg-white p-6 rounded-3xl border-t-[4px] border-t-cyan-500 border-x border-b border-slate-100 shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Mes Cotisations Communes</h4>
                <p class="text-2xl font-black text-slate-800 mt-2">{{ statsParticipant.totalCotisations.toLocaleString('fr-FR') }} FCFA</p>
                <p class="text-[11px] text-slate-400 font-medium mt-1">Fonds de ravitaillement de fin d'année</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-hand-holding-dollar"></i>
              </div>
            </div>
          </div>
          <!-- Mon Capital Cumulé -->
          <div class="bg-white p-6 rounded-3xl border-t-[4px] border-t-indigo-500 border-x border-b border-slate-100 shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Mon Capital Cumulé</h4>
                <p class="text-2xl font-black text-slate-800 mt-2">{{ statsParticipant.capitalCumule.toLocaleString('fr-FR') }} FCFA</p>
                <p class="text-[11px] text-slate-400 font-medium mt-1">Total général accumulé</p>
              </div>
              <div class="h-11 w-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-chart-simple"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Suivi des cotisations hebdomadaires -->
        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-black text-slate-900 tracking-widest uppercase">
                <i class="fa-regular fa-calendar mr-2 text-emerald-500"></i>
                Suivi des cotisations hebdomadaires (200 FCFA)
              </h3>
              <p class="text-xs text-slate-400 mt-1">Chaque mercredi de la tontine. Les cartes indiquent l'état de votre paiement à cette date.</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-4 mt-4 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span class="text-slate-600 font-medium">Cotisation payée</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-rose-500"></span>
              <span class="text-slate-600 font-medium">Cotisation manquante</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></span>
              <span class="text-slate-600 font-medium">Non échu / Futur</span>
            </div>
          </div>

          <div class="mt-6">
            <div class="flex flex-wrap gap-3">
              <div
                v-for="p in pastilles"
                :key="p.date"
                class="flex flex-col items-center gap-1"
              >
                <div :class="[
                  'h-14 w-14 rounded-xl border-2 flex flex-col items-center justify-center text-sm font-bold transition-transform hover:scale-110 cursor-default',
                  p.statut === 'PAID' ? 'bg-emerald-100 text-emerald-700 border-emerald-400' : '',
                  p.statut === 'MISSING' ? 'bg-rose-100 text-rose-700 border-rose-400 animate-pulse' : '',
                  p.statut === 'NON ÉCHU' ? 'bg-slate-100 text-slate-400 border-slate-200' : ''
                ]">
                  <span class="text-[10px] font-normal opacity-70">{{ p.label }}</span>
                  <span class="text-[8px] font-bold">{{ p.dateAffichage }}</span>
                </div>
                <span :class="[
                  'text-[8px] font-bold',
                  p.statut === 'PAID' ? 'text-emerald-600' : '',
                  p.statut === 'MISSING' ? 'text-rose-600' : '',
                  p.statut === 'NON ÉCHU' ? 'text-slate-400' : ''
                ]">{{ p.statusText }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
