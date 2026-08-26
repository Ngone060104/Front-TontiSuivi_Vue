import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

export function useToast() {
  function toast(message, type = 'info', duration = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, type })

    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  function success(message, duration) {
    toast(message, 'success', duration)
  }

  function error(message, duration) {
    toast(message, 'error', duration)
  }

  function info(message, duration) {
    toast(message, 'info', duration)
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    toast,
    success,
    error,
    info,
    removeToast
  }
}
