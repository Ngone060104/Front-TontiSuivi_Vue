import { ref } from 'vue'

const modalState = ref({
  show: false,
  title: '',
  icon: '',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  confirmIcon: '',
  loading: false
})

let resolvePromise = null

export function useModal() {
  function openModal(config = {}) {
    modalState.value = {
      show: true,
      title: config.title || '',
      icon: config.icon || '',
      confirmLabel: config.confirmLabel || 'Confirmer',
      cancelLabel: config.cancelLabel || 'Annuler',
      confirmIcon: config.confirmIcon || '',
      loading: false
    }

    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  function confirmModal() {
    if (resolvePromise) {
      resolvePromise(true)
      resolvePromise = null
    }
    closeModal()
  }

  function closeModal() {
    modalState.value.show = false
    modalState.value.loading = false
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }
  }

  function setLoading(val) {
    modalState.value.loading = val
  }

  return {
    modalState,
    openModal,
    confirmModal,
    closeModal,
    setLoading
  }
}
