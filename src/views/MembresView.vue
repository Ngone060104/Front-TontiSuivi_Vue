<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useToast } from '@/composables/useToast.js'
import { useConfirm } from '@/composables/useConfirm.js'
import { getParticipants, getParticipantStatus, updateParticipant } from '@/services/participantService.js'
import { inscrireNouveauMembre, modifierUtilisateur } from '@/services/userService.js'
import { verifierTelephoneExiste } from '@/utils/validator.js'
import { getCotisationsByParticipant } from '@/services/cotisationService.js'
import { getEpargnesByParticipant, getEpargnes } from '@/services/epargneService.js'
import { getConfiguration } from '@/services/configurationService.js'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ParticipantForm from '@/components/forms/ParticipantForm.vue'

const auth = useAuthStore()

const participantFormRef = ref(null)
const editParticipantFormRef = ref(null)
const { success, error: toastError } = useToast()

const loading = ref(true)
const participants = ref([])
const configuration = ref({ DATE_DEBUT_TONTINE: '2026-06-17' })
const recherche = ref('')
const filtreStatut = ref('')

const showInscriptionModal = ref(false)
const inscriptionLoading = ref(false)

const showDetailModal = ref(false)
const participantSelectionne = ref(null)
const statutSelectionne = ref(null)
const cotisationsSelectionne = ref([])
const epargnesSelectionne = ref([])
const loadingDetail = ref(false)

const showEditModal = ref(false)
const editLoading = ref(false)

const showRecuModal = ref(false)
const recuCotisation = ref(null)
const recuEpargne = ref(null)
const recuSemaine = ref(0)
const recuDateSemaine = ref('')

const pastillesCalculees = ref([])
const filtreDateCotisation = ref('')


const canInscrire = computed(() => auth.role === 'SECRETAIRE')

const sousTitreRole = computed(() => {
  const role = auth.role
  if (role === 'ADMIN') {
    return '<span class="text-rose-600 bg-rose-50 px-3 py-1 rounded-full font-bold text-[11px] inline-block mt-2">R&ocirc;le actuel : Admin (Inscription r&eacute;serv&eacute;e au Secr&eacute;tariat)</span>'
  }
  if (role === 'SECRETAIRE') {
    return '<span class="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-bold text-[11px] inline-block mt-2">R&ocirc;le actuel : Secr&eacute;taire &mdash; Pr&ecirc;t pour les inscriptions</span>'
  }
  if (role === 'RESPONSABLE') {
    return '<span class="text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-bold text-[11px] inline-block mt-2">R&ocirc;le actuel : Responsable &mdash; Enregistrement des versements (via l\'espace Saisie des cotisations)</span>'
  }
  return '<span class="text-slate-600 bg-slate-50 px-3 py-1 rounded-full font-bold text-[11px] inline-block mt-2">R&ocirc;le actuel : ' + (role || 'Utilisateur') + '</span>'
})

const subtitleHtml = computed(() => {
  return 'Consultez, recherchez ou enregistrez les participants de la tontine.<br>' + sousTitreRole.value
})

const participantsFiltres = computed(() => {
  let liste = participants.value
  if (recherche.value) {
    const q = recherche.value.toLowerCase()
    liste = liste.filter(p => {
      const user = p.utilisateur || {}
      const nom = `${user.prenom || ''} ${user.nom || ''}`.toLowerCase()
      const tel = (user.telephone || '').toLowerCase()
      return nom.includes(q) || tel.includes(q)
    })
  }
  if (filtreStatut.value === 'A JOUR') {
    liste = liste.filter(p => p.statutInfo && p.statutInfo.retards === 0)
  }
  if (filtreStatut.value === 'EN RETARD') {
    liste = liste.filter(p => p.statutInfo && p.statutInfo.retards > 0)
  }
  return liste
})

const pastillesFiltrees = computed(() => {
  if (!filtreDateCotisation.value) return pastillesCalculees.value
  return pastillesCalculees.value.filter(p => p.date === filtreDateCotisation.value)
})


const nomEnregistrePar = computed(() => {
  const auteur = recuCotisation.value?.enregistree_par_utilisateur
  if (!auteur) return 'N/A'
  return `${auteur.prenom} ${auteur.nom}`
})


const recuEstPaye = computed(() => {
  return recuCotisation.value?.statutCotisation?.toUpperCase() === 'PAYEE' || !!recuCotisation.value
})

const columns = [
  { label: 'MEMBRES', key: 'membre' },
  { label: 'CONTACT', key: 'contact' },
  { label: 'STATUT', key: 'statut' },
  { label: 'EPARGNE', key: 'epargne' },
  { label: '', key: 'actions' }
]

async function chargerParticipants() {
  loading.value = true
  try {
    const [participantsData, configData, epargnesData] = await Promise.allSettled([
      getParticipants(),
      getConfiguration(),
      getEpargnes()
    ])

    if (participantsData.status === 'fulfilled') {
      const liste = participantsData.value
      const enrichis = await Promise.allSettled(
        liste.map(async (p) => {
          try {
            const statut = await getParticipantStatus(p.id)
            return { ...p, statutInfo: statut }
          } catch {
            return { ...p, statutInfo: null }
          }
        })
      )
      participants.value = enrichis
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)

      if (epargnesData.status === 'fulfilled') {
        const allEpargnes = epargnesData.data || epargnesData.value || []
        participants.value.forEach(p => {
          const participantEpargnes = allEpargnes.filter(e => String(e.participant_info_id) === String(p.id))
          p.totalEpargne = participantEpargnes.reduce((sum, e) => sum + (Number(e.montant) || 0), 0)
        })
      }
    }

    if (configData.status === 'fulfilled') {
      configuration.value = configData.value
    }
  } catch (e) {
    toastError('Erreur lors du chargement des membres')
  } finally {
    loading.value = false
  }
}

async function onInscrire(data) {
  inscriptionLoading.value = true
  try {
    const telephoneExiste = await verifierTelephoneExiste(data.telephone)
   if (telephoneExiste) {
  participantFormRef.value?.setFieldError(
    'telephone',
    'Ce numéro de téléphone est déjà utilisé.'
  )

  inscriptionLoading.value = false
  return
}

    const telephone = data.telephone
    const email = data.email || `${data.prenom.toLowerCase()}.${data.nom.toLowerCase()}@tontisuivi.sn`
    const motDePasse = 'Tonti' + telephone.slice(-4)

    const userData = {
      prenom: data.prenom,
      nom: data.nom,
      telephone: data.telephone,
      email,
      password: motDePasse,
      role_id: 'PARTICIPANT'
    }

    if (data.photo) {
      userData.photo = data.photo
    }

    await inscrireNouveauMembre(
      userData,
      {
        notes: data.notes,
        date_inscription: new Date().toISOString().split('T')[0]
      }
    )

    success(`L'adherent ${data.prenom} ${data.nom} a ete inscrit !`)
    showInscriptionModal.value = false
    await chargerParticipants()
  } catch (e) {
    toastError(e.message || 'Erreur lors de la sauvegarde')
  } finally {
    inscriptionLoading.value = false
  }
}

async function onDetailParticipant(row) {
  showDetailModal.value = true
  loadingDetail.value = true
  participantSelectionne.value = row
  filtreDateCotisation.value = ''
  pastillesCalculees.value = []

  try {
    const [statut, cotisations, epargnes] = await Promise.allSettled([
      getParticipantStatus(row.id),
      getCotisationsByParticipant(row.id),
      getEpargnesByParticipant(row.id)
    ])

    statutSelectionne.value = statut.status === 'fulfilled' ? statut.value : null
    cotisationsSelectionne.value = cotisations.status === 'fulfilled' ? cotisations.value : []
    epargnesSelectionne.value = epargnes.status === 'fulfilled' ? epargnes.value : []

    calculerPastilles()
  } catch {
  } finally {
    loadingDetail.value = false
  }
}

function calculerPastilles() {
  const p = participantSelectionne.value
  if (!p || !p.date_inscription) {
    pastillesCalculees.value = []
    return
  }

  const dateInsc = new Date(p.date_inscription)
  dateInsc.setHours(0, 0, 0, 0)
  const aujourd = new Date()
  aujourd.setHours(0, 0, 0, 0)
  const diffJours = Math.floor((aujourd - dateInsc) / (24 * 60 * 60 * 1000))
  const nbSemaines = Math.floor(diffJours / 7) + 1

  const datesManquantes = statutSelectionne.value?.datesManquantes || []
  const datesCotisees = cotisationsSelectionne.value.map(c => c.date_mercredi)

  const result = []
  for (let semaine = 1; semaine <= nbSemaines; semaine++) {
    const dateSemaine = new Date(dateInsc)
    dateSemaine.setDate(dateSemaine.getDate() + (semaine - 1) * 7)
    const dateStr = dateSemaine.toISOString().split('T')[0]

    const estPaye = datesCotisees.includes(dateStr)
    const estManquant = datesManquantes.includes(dateStr)

    let classes = 'bg-slate-50 text-slate-400 border-slate-200'
    let tooltip = 'Pas encore de cotisation'

    if (estPaye) {
      classes = 'bg-emerald-100 text-emerald-700 border-emerald-300 font-bold'
      tooltip = 'Paye'
    } else if (estManquant) {
      classes = 'bg-rose-100 text-rose-700 border-rose-300 font-bold animate-pulse'
      tooltip = 'En retard'
    }

    result.push({ semaine, date: dateStr, classes, tooltip })
  }

  pastillesCalculees.value = result
}

function ouvrirRecu(dateSemaine) {
  const cotisation = cotisationsSelectionne.value.find(
    c => c.date_mercredi === dateSemaine
  )

  const epargne = epargnesSelectionne.value.find(
    e => e.date_epargne === dateSemaine
  )

  const pastille = pastillesCalculees.value.find(
    p => p.date === dateSemaine
  )

  // On mémorise la semaine sélectionnée
  recuDateSemaine.value = dateSemaine
  recuCotisation.value = cotisation || null
  recuEpargne.value = epargne || null
  recuSemaine.value = pastille ? pastille.semaine : 0

  // Toujours ouvrir le modal
  showRecuModal.value = true
}

function onEditParticipant() {
  showDetailModal.value = false
  showEditModal.value = true
}

async function onEditSubmit(data) {
  editLoading.value = true
  try {
    const p = participantSelectionne.value
    const ancienTelephone = p.utilisateur?.telephone || ''

    if (data.telephone !== ancienTelephone) {
      const telephoneExiste = await verifierTelephoneExiste(data.telephone)
      if (telephoneExiste) {
        toastError('Ce numero de telephone est deja utilise par un autre membre.')
        editLoading.value = false
        return
      }
    }

    const userData = {
      prenom: data.prenom,
      nom: data.nom,
      telephone: data.telephone,
      email: data.email
    }

    if (data.photo) {
      userData.photo = data.photo
    }

    await Promise.all([
      modifierUtilisateur(p.utilisateur_id, userData),
      updateParticipant(p.id, { adresse: data.notes })
    ])

    success('Les informations ont ete modifiees.')
    showEditModal.value = false
    await chargerParticipants()
} catch (e) {
  if (e.status === 409) {
    editParticipantFormRef.value?.setFieldError(
      'telephone',
      e.message || 'Ce numéro de téléphone est déjà utilisé par un autre membre.'
    )

    return
  }

  toastError(e.message || 'Erreur serveur.')
} finally {
  editLoading.value = false
}
}

function getNomParticipant(row) {
  const user = row.utilisateur || {}
  return `${user.prenom || ''} ${user.nom || ''}`.trim()
}

function getInitiales(row) {
  const user = row.utilisateur || {}
  return `${(user.prenom || '')[0] || ''}${(user.nom || '')[0] || ''}`
}

function getTelephone(row) {
  return row.utilisateur?.telephone || 'N/A'
}

function getEmail(row) {
  return row.utilisateur?.email || ''
}

function getNombreRetards(row) {
  return row.statutInfo?.retards || 0
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function recuDateFormatee() {
  const dateBrute =
    recuCotisation.value?.date_cotisation ||
    recuCotisation.value?.date_mercredi ||
    recuDateSemaine.value

  return dateBrute ? formatDate(dateBrute) : 'Date inconnue'
}

onMounted(chargerParticipants)
</script>

<template>
  <div class="space-y-6 max-w-[1400px] mx-auto animate-fadeIn">
    <PageHeader
      kicker="Listes Membres"
      title="Registre des Adherents"
      :subtitle="subtitleHtml"
      :actionLabel="canInscrire ? 'Inscrire un participant' : ''"
      :actionIcon="canInscrire ? 'fa-solid fa-user-plus' : ''"
      @action="showInscriptionModal = true"
    />

    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center">
  <div class="relative w-full max-w-xl">
    <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
    <input
      v-model="recherche"
      id="secretaire-search-input"
      placeholder="Rechercher par nom, prenom, telephone"
      class="w-full pl-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
    />
  </div>
  <select
    v-model="filtreStatut"
    id="secretaire-filter-select"
    class="ml-4 bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-2"
  >
        <option value="">Statut Cotisation</option>
        <option value="A JOUR">A JOUR</option>
        <option value="EN RETARD">EN RETARD</option>
      </select>
    </div>

   <div class="bg-white p-4 rounded-3xl border border-slate-200">
      <AppTable
        :columns="columns"
        :rows="participantsFiltres"
        :loading="loading"
        emptyMessage="Aucun membre enregistre."
        @rowClick="onDetailParticipant"
      >
        <template #membre="{ row }">
          <div class="flex gap-3 items-center">
            <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold">
              {{ getInitiales(row) }}
            </div>
            <div>
              <p class="font-bold">{{ getNomParticipant(row) }}</p>
            </div>
          </div>
        </template>

        <template #contact="{ row }">
          <div>
            <p>{{ getTelephone(row) }}</p>
            <p class="text-xs text-slate-400">{{ getEmail(row) }}</p>
          </div>
        </template>

        <template #statut="{ row }">
          <span v-if="getNombreRetards(row) === 0" class="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-bold">
            <i class="fas fa-check"></i> A jour
          </span>
          <span v-else class="text-rose-600 bg-rose-50 px-3 py-1 rounded-full text-sm font-bold">
            <i class="fas fa-times"></i> {{ getNombreRetards(row) }} retard
          </span>
        </template>

        <template #epargne="{ row }">
          {{ row.totalEpargne?.toLocaleString() || '0' }} FCFA
        </template>

        <template #actions="{ row }">
          <button
            type="button"
            class="text-slate-300 hover:text-emerald-600 transition-colors pl-2"
            @click.stop="onDetailParticipant(row)"
          >
            <i class="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </template>
      </AppTable>
    </div>

    <!-- Modale Inscription -->
    <AppModal
      :show="showInscriptionModal"
      title="Inscrire un nouveau participant"
      icon="fa-solid fa-user-plus"
      confirmLabel=""
      @close="showInscriptionModal = false"
    >
      <ParticipantForm
  ref="participantFormRef"
  :loading="inscriptionLoading"
  @submit="onInscrire"
  @cancel="showInscriptionModal = false"
/>
    </AppModal>

    <!-- Modale Detail Participant -->
    <AppModal
      :show="showDetailModal"
      :sansEntete="true"
      :confirmLabel="''"
      cancelLabel=""
      @close="showDetailModal = false"
    >
      <div v-if="loadingDetail" class="text-center py-8">
        <i class="fa-solid fa-spinner fa-spin text-2xl text-slate-400"></i>
        <p class="text-slate-500 mt-2">Chargement...</p>
      </div>
      <div v-else-if="participantSelectionne" class="font-sans text-left space-y-6">
        <div class="flex items-center space-x-4 border-b border-slate-50 pb-4 justify-between">
          <div class="flex items-center space-x-4">
            <div class="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-sm flex items-center justify-center">{{ getInitiales(participantSelectionne) }}</div>
            <div>
              <h4 class="text-base font-black text-slate-900 leading-tight">{{ getNomParticipant(participantSelectionne) }}</h4>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Profil adherent</p>
            </div>
          </div>
          <div class="flex items-center space-x-2 flex-shrink-0">
            <button
              v-if="auth.role === 'SECRETAIRE'"
              type="button"
              class="h-9 w-9 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Modifier le profil"
              @click="onEditParticipant"
            >
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button
              type="button"
              class="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              @click="showDetailModal = false"
            >Fermer</button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Telephone</span>
            <p class="font-bold text-slate-800 flex items-center"><i class="fa-solid fa-phone mr-1.5 text-slate-400"></i> {{ getTelephone(participantSelectionne) }}</p>
          </div>
          <div>
            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Adresse Email</span>
            <p class="font-bold text-slate-800 flex items-center"><i class="fa-regular fa-envelope mr-1.5 text-slate-400"></i> {{ getEmail(participantSelectionne) || '-' }}</p>
          </div>
        </div>

        <div class="text-xs">
          <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes internes</span>
          <p class="p-3 bg-slate-50 rounded-xl font-medium text-slate-600 border border-slate-100 leading-relaxed">{{ participantSelectionne.adresse || 'Aucune note ou adresse specifique enregistree pour ce membre.' }}</p>
        </div>

        <div class="space-y-4 pt-2">
          <h5 class="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Situation financiere</h5>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
              <span class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cotisations Communes</span>
              <span class="block text-sm font-black text-slate-800 mt-1">{{ (cotisationsSelectionne.reduce((s, c) => s + Number(c.montant || 0), 0)).toLocaleString('fr-FR') }} FCFA</span>
            </div>
            <div class="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl">
              <span class="block text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Epargne Libre</span>
              <span class="block text-sm font-black text-emerald-700 mt-1">{{ (epargnesSelectionne.reduce((s, e) => s + Number(e.montant || 0), 0)).toLocaleString('fr-FR') }} FCFA</span>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 text-xs font-bold text-slate-500">
            <span>Statut de paiement :</span>
            <span v-if="statutSelectionne && statutSelectionne.retards === 0" class="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full">
              <i class="fa-regular fa-circle-check mr-1"></i> Cotisations a jour
            </span>
            <span v-else-if="statutSelectionne" class="text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-full animate-pulse">
              <i class="fa-solid fa-triangle-exclamation mr-1"></i> {{ statutSelectionne.retards }} Cotisation(s) en Retard !
            </span>
          </div>
        </div>

        <div class="space-y-4 pt-2">
          <h5 class="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Suivi des cotisations hebdomadaires</h5>
          <div class="bg-white rounded-2xl border border-slate-100 p-5">
            <div class="mb-4">
              <label class="block text-[10px] font-bold text-slate-400 uppercase mb-2">Rechercher par date</label>
              <input
                v-model="filtreDateCotisation"
                type="date"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs outline-none focus:border-emerald-500"
              >
            </div>
            <div class="flex items-center gap-6 mb-5 text-xs font-bold">
              <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span>PAYE</span></div>
              <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span>EN RETARD</span></div>
            </div>
            <div>
              <div class="flex flex-wrap gap-2.5 pt-1">
                <div
                  v-for="p in pastillesFiltrees"
                  :key="p.date"
                  class="h-8 w-8 rounded-lg border flex items-center justify-center text-xs cursor-pointer hover:scale-110 transition-transform"
                  :class="p.classes"
                  :title="p.tooltip"
                  @click="ouvrirRecu(p.date)"
                >
                  {{ p.semaine }}
                </div>
              </div>
              <p v-if="pastillesFiltrees.length === 0 && filtreDateCotisation" class="mt-4 text-center text-sm text-slate-500 italic">Aucune cotisation trouvee pour cette date.</p>
            </div>
          </div>
        </div>

        <div v-if="auth.role === 'RESPONSABLE'" class="pt-4 border-t border-slate-100 mt-4">
          <button
            type="button"
            class="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 rounded-2xl shadow-md shadow-emerald-100 transition-all transform hover:scale-[1.01]"
            @click="showDetailModal = false"
          >
            <i class="fa-solid fa-money-bill-transfer text-sm"></i>
            <span>Enregistrer versement pour ce membre</span>
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Modale Recu Mercredi -->
    <AppModal
  :show="showRecuModal"
  :title="'Détail du mercredi ' + recuDateFormatee() + ' (Semaine ' + recuSemaine + ')'"
  icon="fas fa-receipt"
  iconClass="bg-slate-50 text-slate-600"
  cancelLabel=""
  confirmLabel="Fermer"
  confirmClass="bg-[#1e293b] hover:bg-slate-800 text-white shadow-none mt-2 w-full flex items-center justify-center font-bold text-xs py-3 rounded-xl"
  @close="showRecuModal = false"
  @confirm="showRecuModal = false"
>
 <div
  class="font-sans text-left text-xs rounded-2xl p-4 -m-2"
  :class="recuEstPaye
    ? 'bg-emerald-50/40 border border-emerald-100'
    : 'bg-rose-50/40 border border-rose-100'"
>

    <!-- INFORMATIONS DU PARTICIPANT -->
    <div class="flex items-center gap-3 pb-4 mb-3 border-b border-slate-100">
      
      <div
        class="h-11 w-11 rounded-full bg-emerald-50 border border-emerald-200
               text-emerald-600 font-black flex items-center justify-center
               text-sm flex-shrink-0"
      >
        {{ getInitiales(participantSelectionne) }}
      </div>

      <div>
        <p class="text-sm font-black text-slate-900">
          {{ getNomParticipant(participantSelectionne) }}
        </p>

        <p class="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1">
          <i class="fa-solid fa-phone text-[10px]"></i>
          {{ getTelephone(participantSelectionne) }}
        </p>
      </div>

    </div>

    <!-- INFORMATIONS DU MERCREDI -->
    <div class="mb-3">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Détail du versement
      </p>
    </div>

    <div class="divide-y divide-slate-100/70 border-t border-b border-slate-100">

      <!-- Cotisation -->
      <div class="flex items-center justify-between py-3.5">

        <span class="font-semibold text-slate-500">
          Cotisation Obligatoire (200 FCFA)
        </span>

       <span
  v-if="recuEstPaye"
  class="text-emerald-600 font-extrabold flex items-center gap-1"
>
  Payée
  <i class="fa-solid fa-circle-check text-xs"></i>
</span>

<span
  v-else
  class="text-rose-600 font-extrabold flex items-center gap-1"
>
  Manquante
  <i class="fa-solid fa-circle-xmark text-xs"></i>
</span>

      </div>

      <!-- Épargne -->
      <div class="flex items-center justify-between py-3.5">

        <span class="font-semibold text-slate-500">
          Épargne Libre
        </span>

        <span class="font-black text-slate-800 text-sm tracking-tight">
          {{
            (recuEpargne ? Number(recuEpargne.montant || 0) : 0)
              .toLocaleString('fr-FR')
          }}
          FCFA
        </span>

      </div>

     <!-- Enregistrée par -->
<div class="flex items-center justify-between py-3.5">
  <span class="font-semibold text-slate-500">Enregistrée par :</span>
  <span class="font-bold text-slate-700">
    {{ nomEnregistrePar }}
  </span>
</div>

      <!-- Heure -->
<div class="flex items-center justify-between py-3.5">
  <span class="font-semibold text-slate-500">Heure :</span>
  <span class="font-black text-slate-800">
    {{ recuCotisation?.heure || 'N/A' }}
  </span>
</div>

    </div>

  </div>
</AppModal>

    <!-- Modale Edition -->
    <AppModal
      :show="showEditModal"
      title="Modifier les informations du participant"
      icon="fas fa-circle-info"
      iconClass="bg-emerald-100 text-emerald-600"
      confirmLabel=""
      @close="showEditModal = false"
    >
      <ParticipantForm
  ref="editParticipantFormRef"
  :participant="participantSelectionne"
  :loading="editLoading"
  @submit="onEditSubmit"
  @cancel="showEditModal = false"
/>
    </AppModal>
  </div>
</template>