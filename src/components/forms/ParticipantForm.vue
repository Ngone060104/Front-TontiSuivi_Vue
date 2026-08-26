<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  participant: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})


const emit = defineEmits(['submit', 'cancel'])

const isEdit = computed(() => !!props.participant)

const champClasse = computed(() =>
  isEdit.value
    ? 'w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all'
    : 'w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-300 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all'
)

const form = ref({
  prenom: '',
  nom: '',
  telephone: '',
  email: '',
  notes: ''
})

const errors = ref({})
const photoFile = ref(null)
const photoPreview = ref(null)
const photoIconClass = ref('fa-solid fa-cloud-arrow-up')
const photoText = ref('Cliquez pour choisir une photo')

watch(() => props.participant, (p) => {
  if (p) {
    const user = p.utilisateur || {}
    form.value = {
      prenom: user.prenom || '',
      nom: user.nom || '',
      telephone: user.telephone || '',
      email: user.email || '',
      notes: p.adresse || ''
    }
    if (user.photo_url) {
      photoPreview.value = user.photo_url
      photoIconClass.value = 'fa-solid fa-circle-check text-emerald-500'
      photoText.value = 'Photo existante'
    }
  } else {
    form.value = { prenom: '', nom: '', telephone: '', email: '', notes: '' }
    photoFile.value = null
    photoPreview.value = null
    photoIconClass.value = 'fa-solid fa-cloud-arrow-up'
    photoText.value = 'Cliquez pour choisir une photo'
  }
}, { immediate: true })

function valider() {
  errors.value = {}
  if (!form.value.prenom.trim()) errors.value.prenom = 'Le prénom est obligatoire.'
  if (!form.value.nom.trim()) errors.value.nom = 'Le nom est obligatoire.'
  if (!form.value.telephone.trim()) errors.value.telephone = 'Le numéro de téléphone est obligatoire.'
  return Object.keys(errors.value).length === 0
}

function onSubmit() {
  if (valider()) {
    emit('submit', { ...form.value, photo: photoFile.value })
  }
}

function setFieldError(field, message) {
  errors.value[field] = message
}


defineExpose({
  setFieldError
})

function triggerFileInput() {
  const input = document.getElementById('participant-file-hidden')
  if (input) input.click()
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    errors.value.photo = 'Image trop lourde. Maximum 10 Mo.'
    e.target.value = ''
    return
  }
  photoFile.value = file
  photoIconClass.value = 'fa-solid fa-circle-check text-emerald-500'
  photoText.value = file.name
  const reader = new FileReader()
  reader.onload = (ev) => {
    photoPreview.value = ev.target.result
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-left text-xs max-h-[60vh] overflow-y-auto pr-2">
    <div>
      <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Prénom *</label>
      <input
        v-model="form.prenom"
        type="text"
        class=""
        :class="[champClasse, errors.prenom ? 'border-rose-300 bg-rose-50/50' : '']"
        placeholder="Ex : Fatima"
      >
      <p v-if="errors.prenom" class="text-[10px] text-rose-500 font-semibold mt-1">{{ errors.prenom }}</p>
    </div>

    <div>
      <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nom *</label>
      <input
        v-model="form.nom"
        type="text"
        class=""
        :class="[champClasse, errors.nom ? 'border-rose-300 bg-rose-50/50' : '']"
        placeholder="Ex : Cissé"
      >
      <p v-if="errors.nom" class="text-[10px] text-rose-500 font-semibold mt-1">{{ errors.nom }}</p>
    </div>

    <div class="sm:col-span-2">
      <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">N° de Téléphone (Sert d'identifiant) *</label>
      <input
        v-model="form.telephone"
        type="tel"
        class=""
        :class="[champClasse, errors.telephone ? 'border-rose-300 bg-rose-50/50' : '']"
        placeholder="Ex : 771234567"
      >
      <p v-if="errors.telephone" class="text-[10px] text-rose-500 font-semibold mt-1">{{ errors.telephone }}</p>
    </div>

    <div class="sm:col-span-2">
      <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Adresse Email (Facultatif)</label>
      <input
        v-model="form.email"
        type="email"
        class=""
        :class="champClasse"
        placeholder="Ex : aminata@mail.com"
      >
      <p v-if="errors.email" class="text-[10px] text-rose-500 font-semibold mt-1">{{ errors.email }}</p>
    </div>

    <div class="sm:col-span-2">
      <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Notes / Remarques (Facultatif)</label>
      <textarea
        v-model="form.notes"
        rows="3"
        class="resize-none"
        :class="champClasse"
        placeholder="Informations supplémentaires (quartier, métier...)"
      ></textarea>
    </div>

    <div class="sm:col-span-2">
      <label class="block text-[11px] text-slate-700 font-bold uppercase tracking-wider mb-2">Photo de l'adhérent</label>
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <input type="file" id="participant-file-hidden" accept="image/*" class="hidden" @change="onFileChange">
          <div
            class="border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-5 text-center cursor-pointer hover:bg-slate-50 transition-colors"
            @click="triggerFileInput"
          >
            <div class="h-9 w-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-sm mb-2 mx-auto">
              <i :class="photoIconClass"></i>
            </div>
            <span class="text-[10px] text-slate-400 font-bold">{{ photoText }}</span>
          </div>
        </div>
        <div
          v-if="photoPreview"
          class="w-28 h-28 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden"
        >
          <img :src="photoPreview" class="w-full h-full object-cover">
        </div>
      </div>
    </div>

    <div class="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        class="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
        @click="$emit('cancel')"
      >Annuler</button>
      <button
        type="submit"
        :disabled="loading"
        class="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white transition disabled:opacity-50 cursor-pointer"
        :class="isEdit ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-none'"
      >
        <i v-if="loading" class="fa-solid fa-spinner animate-spin"></i>
        {{ isEdit ? 'Sauvegarder les modifications' : 'Confirmer l\'inscription' }}
      </button>
    </div>
  </form>
</template>
