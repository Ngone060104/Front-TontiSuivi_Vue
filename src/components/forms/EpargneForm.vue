<script setup>
import { ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps({
  epargne: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['submit', 'cancel'])

const MONTANT_EPARGNE_MIN = 1000

const form = ref({
  date_epargne: new Date().toISOString().split('T')[0],
  montant: ''
})

const errors = ref({})

watch(() => props.epargne, (e) => {
  if (e) {
    form.value = {
      date_epargne: e.date_epargne || new Date().toISOString().split('T')[0],
      montant: e.montant || ''
    }
  }
}, { immediate: true })

function valider() {
  errors.value = {}

  if (!form.value.date_epargne) {
    errors.value.date_epargne = 'La date est requise'
  }

  const montant = Number(form.value.montant)
  if (!form.value.montant) {
    errors.value.montant = 'Le montant est requis'
  } else if (montant <= 0 || montant % MONTANT_EPARGNE_MIN !== 0) {
    errors.value.montant = "L'épargne doit être un multiple de 1000 FCFA."
  }

  return Object.keys(errors.value).length === 0
}

function onSubmit() {
  if (valider()) {
    emit('submit', {
      ...form.value,
      montant: Number(form.value.montant)
    })
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="space-y-4">
    <AppInput
      v-model="form.date_epargne"
      label="Date de l'épargne"
      type="date"
      required
      :error="errors.date_epargne"
    />

    <AppInput
      v-model="form.montant"
      label="Montant (FCFA)"
      type="number"
      placeholder="Ex: 1000, 2000, 3000..."
      required
      :error="errors.montant"
    />

    <p class="text-xs text-slate-500">
      <i class="fa-solid fa-circle-info mr-1"></i>
      L'épargne doit être un multiple de 1000 FCFA
    </p>

    <div class="flex items-center justify-end gap-3 pt-2">
  <AppButton
    label="Annuler"
    variant="secondary"
    @click="$emit('cancel')"
  />

  <AppButton
    :label="epargne ? 'Sauvegarder les modifications' : 'Enregistrer'"
    :loading="loading"
    icon="fa-solid fa-check"
    variant="amber"
    class = "w-full"
    @click="onSubmit"
  />
</div>
  </form>
</template>
