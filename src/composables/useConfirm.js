import { ref } from 'vue'

const confirmState = ref({
  show: false,
  message: '',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  loading: false
})

let resolveConfirm = null

export function useConfirm() {
  function confirm(message, options = {}) {
    confirmState.value = {
      show: true,
      message,
      confirmLabel: options.confirmLabel || 'Confirmer',
      cancelLabel: options.cancelLabel || 'Annuler',
      loading: false
    }

    return new Promise((resolve) => {
      resolveConfirm = resolve
    })
  }

  function confirmAction() {
    confirmState.value.loading = true
    if (resolveConfirm) {
      resolveConfirm(true)
      resolveConfirm = null
    }
    confirmState.value.show = false
    confirmState.value.loading = false
  }

  function cancelConfirm() {
    if (resolveConfirm) {
      resolveConfirm(false)
      resolveConfirm = null
    }
    confirmState.value.show = false
    confirmState.value.loading = false
  }

  return {
    confirmState,
    confirm,
    confirmAction,
    cancelConfirm
  }
}
