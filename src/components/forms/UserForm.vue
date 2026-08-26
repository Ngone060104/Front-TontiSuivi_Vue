<script setup>
import { ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { uploadImageToCloudinary } from '@/services/cloudinaryService.js'
import { verifierTelephoneExiste } from '@/utils/validator.js'

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['submit', 'cancel'])

const form = ref({
  prenom: '',
  nom: '',
  telephone: '',
  email: '',
  role_id: '',
  photo: null
})

const photoPreview = ref(null)
const photoFile = ref(null)
const errors = ref({})

watch(() => props.user, (u) => {
  if (u) {
    form.value = {
      prenom: u.prenom || '',
      nom: u.nom || '',
      telephone: u.telephone || '',
      email: u.email || '',
      role_id: u.role_id || '',
      photo: null
    }
    photoPreview.value = u.photo || null
  }
}, { immediate: true })

function onPhotoChange(event) {
  const file = event.target.files[0]
  if (file) {
    photoFile.value = file
    photoPreview.value = URL.createObjectURL(file)
    form.value.photo = file
  }
}

function valider() {
  errors.value = {}

  if (!form.value.prenom.trim()) errors.value.prenom = 'Le prénom est requis'
  if (!form.value.nom.trim()) errors.value.nom = 'Le nom est requis'
  if (!form.value.telephone.trim()) {
    errors.value.telephone = 'Le téléphone est requis'
  } else if (!/^[0-9]{9,10}$/.test(form.value.telephone)) {
    errors.value.telephone = 'Numéro de téléphone invalide'
  }
  if (!form.value.email.trim()) {
    errors.value.email = "L'email est requis"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Email invalide'
  }
  if (!form.value.role_id) errors.value.role_id = 'Le rôle est requis'
  if (!props.user && !photoFile.value) errors.value.photo = 'La photo est requise'

  return Object.keys(errors.value).length === 0
}

async function onSubmit() {
  if (!valider()) return

  const telephoneChanged = !props.user || form.value.telephone !== props.user.telephone
  if (telephoneChanged) {
    const existe = await verifierTelephoneExiste(form.value.telephone)
    if (existe) {
      errors.value.telephone = 'Ce numéro de téléphone est déjà utilisé'
      return
    }
  }

  const submitData = { ...form.value }

  if (form.value.photo && photoFile.value) {
    try {
      const photoUrl = await uploadImageToCloudinary(photoFile.value)
      submitData.photo = photoUrl
    } catch (e) {
      errors.value.photo = "Erreur lors de l'upload de la photo"
      return
    }
  } else {
    delete submitData.photo
  }

  emit('submit', submitData)
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <AppInput v-model="form.prenom" label="Prénom" placeholder="Ex : Fatima" required :error="errors.prenom" />
      <AppInput v-model="form.nom" label="Nom" placeholder="Ex : Cissé" required :error="errors.nom" />
    </div>

    <AppInput v-model="form.telephone" label="Téléphone" type="tel" placeholder="Ex : 771234567" required :error="errors.telephone" />
    <AppInput v-model="form.email" label="Email" type="email" placeholder="Ex : f.cisse@tontisuivi.sn" required :error="errors.email" />

    <div>
      <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Photo <span v-if="!user" class="text-rose-500">*</span></label>
      <div class="flex items-center gap-4">
        <div v-if="photoPreview" class="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
          <img :src="photoPreview" alt="Aperçu" class="w-full h-full object-cover" />
        </div>
        <label class="flex-1 cursor-pointer">
          <div class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-sm hover:bg-slate-100 transition-all text-center">
            <i class="fa-solid fa-camera mr-2"></i>{{ photoPreview ? 'Changer la photo' : 'Choisir une photo' }}
          </div>
          <input type="file" accept="image/*" class="hidden" @change="onPhotoChange" />
        </label>
      </div>
      <p v-if="errors.photo" class="mt-1 text-xs text-rose-500">{{ errors.photo }}</p>
    </div>

    <div>
      <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rôle <span class="text-rose-500">*</span></label>
      <select
        v-model="form.role_id"
        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
      >
        <option value="" disabled>Choisir un rôle *</option>
        <option value="ADMIN">Administrateur (Gestion des Comptes)</option>
        <option value="SECRETAIRE">Secrétaire (Inscription, Fichiers membres)</option>
        <option value="RESPONSABLE">Responsable Caisse (Saisie des versements)</option>
      </select>
      <p v-if="errors.role_id" class="mt-1 text-xs text-rose-500">{{ errors.role_id }}</p>
    </div>

    <div class="flex items-center justify-end gap-3 pt-2">
      <AppButton label="Annuler" variant="secondary" @click="$emit('cancel')" />
      <AppButton
        :label="user ? 'Enregistrer les modifications' : 'Confirmer l\'inscription'"
        :loading="loading"
        icon="fa-solid fa-check"
        @click="onSubmit"
      />
    </div>
  </form>
</template>
