<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useToast } from '@/composables/useToast.js'
import { useConfirm } from '@/composables/useConfirm.js'
import {
  recupererTousLesUtilisateurs,
  basculerEtatCompte,
  reinitialiserMotDePasse
} from '@/services/userService.js'
import { uploadImageToCloudinary } from '@/services/cloudinaryService.js'
import { verifierTelephoneExiste } from '@/utils/validator.js'
import { apiUpload } from '@/services/apiClient.js'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'

const { success, error: toastError } = useToast()
const { confirm } = useConfirm()


const previewCreate = ref('')
const previewEdit = ref('')

function onFileChange(event, target) {
  const file = event.target.files?.[0]
  if (!file) return

  const url = URL.createObjectURL(file)
  if (target === 'create') {
    previewCreate.value = url
  } else {
    previewEdit.value = url
  }
}

const loading = ref(true)
const utilisateurs = ref([])
const recherche = ref('')
const filtreRole = ref('TOUS')

const showCreateModal = ref(false)
const createLoading = ref(false)

const showEditModal = ref(false)
const editLoading = ref(false)
const userToEdit = ref(null)

const showDetailModal = ref(false)
const userToDetail = ref(null)

const showResetModal = ref(false)
const resetLoading = ref(false)
const userToReset = ref(null)

const LABELS_ROLES = {
  ADMIN: 'Administrateur',
  RESPONSABLE: 'Responsable',
  SECRETAIRE: 'Secrétaire',
  PARTICIPANT: 'Participant'
}

const utilisateursFiltres = computed(() => {
  let liste = utilisateurs.value
  if (recherche.value) {
    const q = recherche.value.toLowerCase()
    liste = liste.filter(u => {
      const nom = `${u.prenom || ''} ${u.nom || ''}`.toLowerCase()
      const tel = (u.telephone || '').toLowerCase()
      return nom.includes(q) || tel.includes(q)
    })
  }
  if (filtreRole.value !== 'TOUS') {
    liste = liste.filter(u => u.role_id === filtreRole.value)
  }
  return liste
})

const columns = [
  { label: 'UTILISATEUR', key: 'utilisateur' },
  { label: 'ROLE / ACCÈS', key: 'role' },
  { label: 'TÉLÉPHONE', key: 'telephone' },
  { label: 'EMAIL', key: 'email' },
  { label: 'ETAT COMPTE', key: 'statut' },
  { label: 'ACTION', key: 'actions' }
]

async function chargerUtilisateurs() {
  loading.value = true
  try {
    utilisateurs.value = await recupererTousLesUtilisateurs()
  } catch (e) {
    toastError('Erreur lors du chargement des utilisateurs')
  } finally {
    loading.value = false
  }
}

function onEdit(user) {
  userToEdit.value = { ...user }
  showDetailModal.value = false
  nextTick(() => { showEditModal.value = true })
}

function onDetail(user) {
  userToDetail.value = user
  showDetailModal.value = true
}

function onResetPassword(user) {
  userToReset.value = user
  showDetailModal.value = false
  nextTick(() => { showResetModal.value = true })
}

async function onToggle(user) {
  const nouveauEtat = user.actif === false ? true : false
  const phraseAlerte = nouveauEtat ? 'activer' : 'suspendre'
  const nomComplet = `${user.prenom} ${user.nom}`
  const confirmLabelBtn = nouveauEtat ? 'Oui, Activer' : 'Oui, Suspendre'

  try {
    const ok = await confirm(`Êtes-vous sûr de vouloir ${phraseAlerte} l'accès de l'utilisateur ${nomComplet} à l'application TontiSuivi ?`, { confirmLabel: confirmLabelBtn })
    if (!ok) return

    await basculerEtatCompte(user.id, nouveauEtat)
    success(`Le statut d'accès de ${user.prenom} ${user.nom} a été mis à jour.`)
    await chargerUtilisateurs()
  } catch (e) {
    toastError("Impossible d'altérer l'état de cet utilisateur.")
  }
}

async function onDetailConfirm() {
  userToEdit.value = { ...userToDetail.value }
  showDetailModal.value = false
  nextTick(() => { showEditModal.value = true })
}

function getRoleBadge(roleId) {
  const colors = {
    ADMIN: 'text-indigo-600 bg-indigo-50/50 font-bold',
    SECRETAIRE: 'text-cyan-600 bg-cyan-50/50 font-bold',
    RESPONSABLE: 'text-emerald-600 bg-emerald-50/50 font-bold',
    PARTICIPANT: 'text-amber-600 bg-amber-50/50 font-bold'
  }
  return colors[roleId] || 'text-slate-600 bg-slate-50'
}

function getInitiales(user) {
  const initialeP = user.prenom ? user.prenom.charAt(0).toUpperCase() : ''
  const initialeN = user.nom ? user.nom.charAt(0).toUpperCase() : ''
  return `${initialeP}${initialeN}`
}

function getPseudoRole(user) {
  return `@${(user.role_id || '').toLowerCase()}`
}

async function onCreateSubmit() {
  const modal = document.getElementById('create-modal-body')

  if (!modal) return

  const prenom = modal.querySelector('#modal-prenom')?.value.trim() || ''
  const nom = modal.querySelector('#modal-nom')?.value.trim() || ''
  const telephone = modal.querySelector('#modal-telephone')?.value.trim() || ''
  const email = modal.querySelector('#modal-email')?.value.trim() || ''
  const roleId = modal.querySelector('#modal-role')?.value || ''

  clearErrors(modal)

  let hasError = false

  if (!prenom) {
    showError(modal, 'prenom', 'Le prénom est obligatoire.')
    hasError = true
  }

  if (!nom) {
    showError(modal, 'nom', 'Le nom de famille est obligatoire.')
    hasError = true
  }

  if (!telephone) {
    showError(modal, 'tel', 'Le numéro de téléphone est obligatoire.')
    hasError = true
  }

  if (!email) {
    showError(modal, 'email', "L'adresse email est obligatoire.")
    hasError = true
  }

  if (!roleId) {
    showError(modal, 'role', 'Le rôle est obligatoire.')
    hasError = true
  }

  if (hasError) return

  const existe = await verifierTelephoneExiste(telephone)

  if (existe) {
    showError(
      modal,
      'tel',
      'Ce numéro de téléphone est déjà associé à un compte.'
    )
    return
  }

  createLoading.value = true

  try {
    let urlPhoto = ''

    const fileInput = modal.querySelector('#modal-file-hidden')

    if (fileInput?.files?.length) {
      urlPhoto = await uploadImageToCloudinary(fileInput.files[0])
    }

    const formData = new FormData()

    formData.append('nom', nom)
    formData.append('prenom', prenom)
    formData.append('telephone', telephone)
    formData.append('email', email)
    formData.append('password', 'Tonti' + telephone.slice(-4))
    formData.append('role_id', roleId)

    if (urlPhoto) {
      formData.append('photo_url', urlPhoto)
    }

    await apiUpload('/utilisateurs', formData)

    success(`Le compte de ${prenom} ${nom} a été créé !`)

    showCreateModal.value = false

    await chargerUtilisateurs()

  } catch (e) {
    console.error('Erreur lors de la création :', e)

    toastError(
      "Erreur lors de l'envoi de la photo ou de la sauvegarde."
    )

  } finally {
    createLoading.value = false
  }
}

async function onEditSubmit() {
  const modal = document.getElementById('edit-modal-body')

  if (!modal) return

  const prenom = modal.querySelector('#edit-prenom')?.value.trim() || ''
  const nom = modal.querySelector('#edit-nom')?.value.trim() || ''
  const telephone = modal.querySelector('#edit-telephone')?.value.trim() || ''
  const email = modal.querySelector('#edit-email')?.value.trim() || ''
  const roleId = modal.querySelector('#edit-role')?.value || ''

  clearErrors(modal)

  if (!prenom) {
    showError(modal, 'edit-prenom', 'Le prénom est requis.')
    return
  }

  if (!nom) {
    showError(modal, 'edit-nom', 'Le nom est requis.')
    return
  }

  if (!telephone) {
    showError(modal, 'edit-tel', 'Le téléphone est requis.')
    return
  }

  if (!email) {
    showError(modal, 'edit-email', "L'adresse email est requise.")
    return
  }

  editLoading.value = true

  try {
    // Vérification du numéro de téléphone
    if (telephone !== userToEdit.value.telephone) {
      const doublon = await verifierTelephoneExiste(telephone)

      if (doublon) {
        showError(
          modal,
          'edit-tel',
          'Ce numéro de téléphone est déjà pris par un autre compte.'
        )
        return
      }
    }

    // Gestion de la photo
    let urlPhoto = userToEdit.value.photo_url || ''

    const fileInput = modal.querySelector('#edit-file-hidden')

    if (fileInput?.files?.length) {
      urlPhoto = await uploadImageToCloudinary(fileInput.files[0])
    }

    // Préparation des données
    const formData = new FormData()

    formData.append('nom', nom)
    formData.append('prenom', prenom)
    formData.append('telephone', telephone)
    formData.append('email', email)
    formData.append('role_id', roleId)

    if (urlPhoto) {
      formData.append('photo_url', urlPhoto)
    }

    // Modification de l'utilisateur
    await apiUpload(
      `/utilisateurs/${userToEdit.value.id}`,
      formData,
      'PATCH'
    )

    success('Les modifications ont été enregistrées avec succès !')

    showEditModal.value = false

    await chargerUtilisateurs()

  } catch (e) {
    console.error(
      'Erreur lors de la modification de l’utilisateur :',
      e
    )

    toastError(
      'Erreur lors de la sauvegarde des modifications.'
    )

  } finally {
    editLoading.value = false
  }
}

async function onResetSubmit() {
  const modal = document.getElementById('reset-modal-body')
  if (!modal) return

  const pass = modal.querySelector('#reset-pass')?.value || ''
  const passConfirm = modal.querySelector('#reset-pass-confirm')?.value || ''
  const btnSubmit = modal.closest('.relative')?.querySelector('[type=submit]')

  clearErrors(modal)

  if (pass.length < 8) {
    showError(modal, 'reset-pass', 'Le mot de passe doit contenir au moins 8 caractères.')
    return
  }
  if (pass !== passConfirm) {
    showError(modal, 'reset-pass-confirm', 'Les deux mots de passe ne correspondent pas.')
    return
  }

  btnSubmit.disabled = true
  btnSubmit.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i> Modification...`

  try {
    await reinitialiserMotDePasse(userToReset.value.id, pass)
    success(`Le mot de passe de ${userToReset.value.prenom} a été réinitialisé !`)
    showResetModal.value = false
    await chargerUtilisateurs()
  } catch (e) {
    toastError('Erreur lors de la réinitialisation.')
    btnSubmit.disabled = false
    btnSubmit.innerHTML = 'Réinitialiser'
  }
}

function clearErrors(modal) {
  modal.querySelectorAll('[id^="error-"]').forEach(p => {
    p.classList.add('hidden')
    p.textContent = ''
  })
  modal.querySelectorAll('input, select').forEach(el => {
    el.classList.remove('border-rose-300', 'bg-rose-50/50')
  })
}

function showError(modal, suffixId, message) {
  const pError = modal.querySelector(`#error-${suffixId}`)
  if (pError) {
    pError.textContent = message
    pError.classList.remove('hidden')
  }
}

onMounted(chargerUtilisateurs)

function toggleResetPass() {
  const input = document.getElementById('reset-pass')
  const btn = document.getElementById('toggle-reset-pass')
  if (!input || !btn) return
  const estMasque = input.type === 'password'
  input.type = estMasque ? 'text' : 'password'
  btn.innerHTML = `<i class="fa-regular ${estMasque ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i>`
}

function triggerFileInput(inputId) {
  document.getElementById(inputId)?.click()
}

</script>

<template>
  <div class="space-y-6 max-w-[1400px] mx-auto animate-fadeIn font-sans">
    <PageHeader
      kicker="Paramètres système"
      title="Gestion des Utilisateurs & Droits"
      subtitle="Configurez et supervisez les comptes administratifs (Secrétariat, Caisse) et participants."
      actionLabel="Nouveau Compte Coordinateur"
      actionIcon="fa-solid fa-user-plus"
      @action="showCreateModal = true"
    />

    <!-- Bloc des filtres intermédiaires -->
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="relative w-full sm:max-w-xs">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <i class="fa-solid fa-magnifying-glass text-xs"></i>
        </span>
        <input
          v-model="recherche"
          type="text"
          placeholder="rechercher par nom, téléphone"
          class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-300 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
        />
      </div>

      <div class="flex items-center space-x-3 w-full sm:w-auto justify-end">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Role :</label>
        <select
          v-model="filtreRole"
          class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
        >
          <option value="TOUS">Filtrer par Rôle</option>
          <option value="ADMIN">Administrateur</option>
          <option value="SECRETAIRE">Secrétaire</option>
          <option value="RESPONSABLE">Responsable</option>
          <option value="PARTICIPANT">Membre Participant</option>
        </select>
      </div>
    </div>

    <!-- Tableau -->
    <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-soft">
      <AppTable :columns="columns" :rows="utilisateursFiltres" :loading="loading" emptyMessage="Aucun compte ne correspond à vos filtres.">
      <template #utilisateur="{ row }">
        <div class="flex items-center space-x-3.5 font-sans">
          <div class="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-xs flex-shrink-0">
            {{ getInitiales(row) }}
          </div>
          <div>
            <p class="font-extrabold text-slate-800 text-sm leading-tight">{{ row.prenom }} {{ row.nom }}</p>
            <p class="text-[10px] text-slate-300 font-semibold mt-0.5">{{ getPseudoRole(row) }}</p>
          </div>
        </div>
      </template>

      <template #role="{ row }">
        <span :class="['px-3 py-1 text-xs rounded-xl', getRoleBadge(row.role_id)]">
          {{ LABELS_ROLES[row.role_id] || 'Inconnu' }}
        </span>
      </template>

      <template #telephone="{ row }">
        <span class="font-bold text-slate-700 text-xs">{{ row.telephone || '-' }}</span>
      </template>

      <template #email="{ row }">
        <span class="font-bold text-slate-700 text-xs">{{ row.email || '-' }}</span>
      </template>

      <template #statut="{ row }">
        <div class="flex items-center space-x-2 font-bold text-xs"
          :class="row.actif === false ? 'text-rose-600' : 'text-emerald-600'"
        >
          <i
            class="fa-solid p-1.5 rounded-lg text-[10px]"
            :class="row.actif === false ? 'fa-user-xmark text-rose-500 bg-rose-50' : 'fa-user-check text-emerald-500 bg-emerald-50'"
          ></i>
          <span>{{ row.actif === false ? 'Désactivée' : 'Actif' }}</span>
        </div>
      </template>

      <template #actions="{ row }">
        <div v-if="row.role_id === 'ADMIN'" class="text-[10px] text-slate-300 font-bold uppercase tracking-wider pl-2">Système</div>
        <div v-else class="flex items-center space-x-3 pl-1">
          <button
            class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors shadow-sm"
            :title="row.actif === false ? 'Activer le compte' : 'Désactiver le compte'"
            @click.stop="onToggle(row)"
          >
            <i
              class="fa-solid text-xs transition-colors"
              :class="row.actif === false ? 'fa-lock text-emerald-500 hover:text-emerald-600' : 'fa-lock-open text-slate-400 hover:text-rose-500'"
            ></i>
          </button>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-slate-50/50 text-slate-300 hover:text-slate-500 transition-colors"
            title="Voir les détails"
            @click.stop="onDetail(row)"
          >
            <i class="fa-regular fa-eye text-xs"></i>
          </button>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-slate-50/50 text-slate-300 hover:text-slate-500 transition-colors"
            title="Modifier"
            @click.stop="onEdit(row)"
          >
            <i class="fa-regular fa-pen-to-square text-xs"></i>
          </button>
          <button
            class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-slate-50/50 text-slate-300 hover:text-amber-500 transition-colors"
            title="Réinitialiser le mot de passe"
            @click.stop="onResetPassword(row)"
          >
            <i class="fa-solid fa-key text-[11px]"></i>
          </button>
        </div>
      </template>
      </AppTable>
    </div>

    <!-- Modale Détail -->
    <AppModal
      :show="showDetailModal"
      title="Fiche Utilisateur"
      icon="fa-solid fa-id-card"
      iconClass="bg-slate-100 text-slate-700"
      confirmLabel="Modifier le Profil"
      confirmClass="bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700"
      cancelLabel="Fermer"
      @close="showDetailModal = false"
      @confirm="onDetailConfirm"
    >
      <div v-if="userToDetail" class="font-sans text-left space-y-6 py-2">
        <div class="flex items-center space-x-4">
          <div class="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-base flex-shrink-0">
            {{ getInitiales(userToDetail) }}
          </div>
          <div>
            <h4 class="text-xl font-black text-slate-900 leading-tight">{{ userToDetail.prenom }} {{ userToDetail.nom }}</h4>
            <p class="text-xs text-slate-400 font-semibold mt-0.5">{{ getPseudoRole(userToDetail) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4 pt-4 border-t border-slate-50">
          <div>
            <h5 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rôle Système</h5>
            <p class="text-sm font-bold text-indigo-600 mt-1.5">{{ LABELS_ROLES[userToDetail.role_id] || userToDetail.role_id }}</p>
          </div>
          <div>
            <h5 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Numéro de Téléphone</h5>
            <p class="text-sm font-bold text-slate-800 mt-1.5">{{ userToDetail.telephone || '-' }}</p>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-50">
          <h5 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">État de Connexion</h5>
          <div class="flex items-center space-x-2 font-extrabold text-xs"
            :class="userToDetail.actif === false ? 'text-rose-600' : 'text-emerald-600'"
          >
            <span class="h-2 w-2 rounded-full animate-pulse"
              :class="userToDetail.actif === false ? 'bg-rose-500' : 'bg-emerald-500'"
            ></span>
            <span>{{ userToDetail.actif === false ? 'Compte Suspendu / Désactivée' : 'Compte Actif / Opérationnel' }}</span>
          </div>
        </div>
      </div>
    </AppModal>

    <!-- Modale Création -->
    <AppModal
      :show="showCreateModal"
      title="Inscrire un nouvel utilisateur"
      icon="fa-solid fa-user-gear"
      iconClass="bg-emerald-50 text-emerald-600"
      confirmLabel="Confirmer l'inscription"
      confirmClass="bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700"
      :loading="createLoading"
      @close="showCreateModal = false"
      @confirm="onCreateSubmit"
    >
      <div id="create-modal-body" class="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-left">
        <div>
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Prénom *</label>
          <input type="text" id="modal-prenom" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-300 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Ex : Fatima">
          <p id="error-prenom" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nom *</label>
          <input type="text" id="modal-nom" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-300 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Ex : Cissé">
          <p id="error-nom" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Numéro de Téléphone *</label>
          <input type="tel" id="modal-telephone" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-300 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Ex : 771234567">
          <p id="error-tel" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email *</label>
          <input type="email" id="modal-email" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-300 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Ex : f.cisse@tontisuivi.sn">
          <p id="error-email" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rôle & Droits Accordés *</label>
          <select id="modal-role" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer">
            <option value="" selected disabled>Choisir un rôle *</option>
            <option value="ADMIN">Administrateur (Gestion des Comptes)</option>
            <option value="SECRETAIRE">Secrétaire (Inscription, Fichiers membres)</option>
            <option value="RESPONSABLE">Responsable Caisse (Saisie des versements)</option>
          </select>
          <p id="error-role" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Illustration de l'utilisateur (Photo)</label>
          <input type="file" id="modal-file-hidden" accept="image/*" class="hidden" @change="onFileChange($event, 'create')">
     <div
  id="modal-dropzone"
  class="border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors group flex flex-col items-center justify-center overflow-hidden"
  @click="triggerFileInput('modal-file-hidden')"
>
  <template v-if="previewCreate">
    <img :src="previewCreate" class="h-24 w-24 rounded-xl object-cover mb-2" alt="Aperçu">
    <span class="text-[10px] text-emerald-600 font-bold">Cliquez pour changer</span>
  </template>
  <template v-else>
    <div class="h-9 w-9 rounded-xl bg-slate-100 text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-colors flex items-center justify-center text-sm mb-2">
      <i class="fa-solid fa-cloud-arrow-up"></i>
    </div>
    <span class="text-[10px] text-slate-400 font-bold">Cliquez pour choisir une photo</span>
    <span class="text-[9px] text-slate-300 font-semibold mt-0.5">PNG, JPG ou JPEG</span>
  </template>
</div>
          <p id="error-upload" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
      </div>
    </AppModal>

    <!-- Modale Édition -->
    <AppModal
      :show="showEditModal"
      title="Modifier un utilisateur"
      icon="fa-solid fa-user-pen"
      iconClass="bg-indigo-50 text-indigo-600"
      confirmLabel="Enregistrer les modifications"
      confirmClass="bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700"
      :loading="editLoading"
      @close="showEditModal = false"
      @confirm="onEditSubmit"
    >
      <div id="edit-modal-body" class="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-left">
        <div>
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Prénom *</label>
          <input type="text" id="edit-prenom" :value="userToEdit?.prenom" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all">
          <p id="error-edit-prenom" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nom *</label>
          <input type="text" id="edit-nom" :value="userToEdit?.nom" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all">
          <p id="error-edit-nom" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Numéro de Téléphone *</label>
          <input type="tel" id="edit-telephone" :value="userToEdit?.telephone" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all">
          <p id="error-edit-tel" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email *</label>
          <input type="email" id="edit-email" :value="userToEdit?.email" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all">
          <p id="error-edit-email" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rôle & Droits Accordés *</label>
          <select id="edit-role" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer">
            <option value="ADMIN" :selected="userToEdit?.role_id === 'ADMIN'">Administrateur (Gestion des comptes)</option>
            <option value="SECRETAIRE" :selected="userToEdit?.role_id === 'SECRETAIRE'">Secrétaire (Inscription, Fichiers membres)</option>
            <option value="RESPONSABLE" :selected="userToEdit?.role_id === 'RESPONSABLE'">Responsable Caisse (Saisie des versements)</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Remplacer la photo de profil (Optionnel)</label>
          <input type="file" id="edit-file-hidden" accept="image/*" class="hidden" @change="onFileChange($event, 'edit')">
       <div
  id="edit-dropzone"
  class="border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-5 text-center cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-center justify-center overflow-hidden"
  @click="triggerFileInput('edit-file-hidden')"
>
  <template v-if="previewEdit || userToEdit?.photo_url">
    <img :src="previewEdit || userToEdit?.photo_url" class="h-24 w-24 rounded-xl object-cover mb-2" alt="Aperçu">
    <span class="text-[10px] text-emerald-600 font-bold">Cliquez pour changer</span>
  </template>
  <template v-else>
    <div class="h-9 w-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xs mb-2">
      <i class="fa-solid fa-cloud-arrow-up"></i>
    </div>
    <span class="text-[10px] text-slate-400 font-bold">Cliquez pour choisir une photo</span>
  </template>
</div>
        </div>
      </div>
    </AppModal>

    <!-- Modale Reset Password -->
    <AppModal
      :show="showResetModal"
      title="Réinitialiser le mot de passe"
      icon="fa-solid fa-key"
      iconClass="bg-amber-50 text-amber-500"
      confirmLabel="Réinitialiser"
      confirmClass="bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700"
      cancelLabel="Annuler"
      :loading="resetLoading"
      @close="showResetModal = false"
      @confirm="onResetSubmit"
    >
      <div id="reset-modal-body" class="font-sans text-left space-y-5 py-2">
        <div class="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
          <div class="flex items-center space-x-3">
            <div class="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-xs">
              {{ getInitiales(userToReset) }}
            </div>
            <div>
              <h4 class="font-extrabold text-slate-800 text-sm leading-tight">{{ userToReset?.prenom }} {{ userToReset?.nom }}</h4>
              <p class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{{ LABELS_ROLES[userToReset?.role_id] }}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Identifiant / Phone</span>
            <span class="text-xs font-bold text-slate-700 mt-0.5 block">{{ userToReset?.telephone }}</span>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nouveau mot de passe *</label>
          <div class="relative">
            <input type="password" id="reset-pass" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Au moins 8 caractères">
            <button type="button" id="toggle-reset-pass" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600" @click="toggleResetPass">
              <i class="fa-regular fa-eye text-xs"></i>
            </button>
          </div>
          <p id="error-reset-pass" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirmer le nouveau mot de passe *</label>
          <input type="password" id="reset-pass-confirm" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Confirmer le mot de passe">
          <p id="error-reset-pass-confirm" class="text-[10px] text-rose-500 font-semibold mt-1 hidden"></p>
        </div>
      </div>
    </AppModal>
  </div>
</template>
