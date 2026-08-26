<script setup>
import { ref } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  isAdminReset: { type: Boolean, default: false },
  title: { type: String, default: 'Changer le mot de passe' }
})

const emit = defineEmits(['submit', 'cancel'])

const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = ref({})
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

function valider() {
  errors.value = {}

  if (!props.isAdminReset && !form.value.oldPassword) {
    errors.value.oldPassword = 'L\'ancien mot de passe est requis'
  }

  if (!form.value.newPassword) {
    errors.value.newPassword = 'Le nouveau mot de passe est requis'
  } else {
    const minLength = props.isAdminReset ? 8 : 6
    if (form.value.newPassword.length < minLength) {
      errors.value.newPassword = `Le mot de passe doit contenir au moins ${minLength} caractères.`
    }
  }

  if (form.value.newPassword !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Les deux mots de passe ne correspondent pas.'
  }

  return Object.keys(errors.value).length === 0
}

function onSubmit() {
  if (valider()) {
    emit('submit', {
      oldPassword: form.value.oldPassword,
      newPassword: form.value.newPassword
    })
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="space-y-4">
    <div v-if="!isAdminReset" class="relative">
      <AppInput
        v-model="form.oldPassword"
        label="Ancien mot de passe"
        :type="showOldPassword ? 'text' : 'password'"
        required
        :error="errors.oldPassword"
      />
      <button type="button" class="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600" @click="showOldPassword = !showOldPassword">
        <i :class="showOldPassword ? 'fa-solid fa-eye-slash' : 'fa-regular fa-eye'"></i>
      </button>
    </div>

    <div class="relative">
      <AppInput
        v-model="form.newPassword"
        label="Nouveau mot de passe"
        :type="showNewPassword ? 'text' : 'password'"
        required
        :error="errors.newPassword"
      />
      <button type="button" class="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600" @click="showNewPassword = !showNewPassword">
        <i :class="showNewPassword ? 'fa-solid fa-eye-slash' : 'fa-regular fa-eye'"></i>
      </button>
    </div>

    <div class="relative">
      <AppInput
        v-model="form.confirmPassword"
        label="Confirmer le mot de passe"
        :type="showConfirmPassword ? 'text' : 'password'"
        required
        :error="errors.confirmPassword"
      />
      <button type="button" class="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600" @click="showConfirmPassword = !showConfirmPassword">
        <i :class="showConfirmPassword ? 'fa-solid fa-eye-slash' : 'fa-regular fa-eye'"></i>
      </button>
    </div>

    <div class="flex items-center justify-end gap-3 pt-2">
      <AppButton label="Annuler" variant="secondary" @click="$emit('cancel')" />
      <AppButton
        label="Réinitialiser"
        :loading="loading"
        icon="fa-solid fa-floppy-disk"
        @click="onSubmit"
      />
    </div>
  </form>
</template>
