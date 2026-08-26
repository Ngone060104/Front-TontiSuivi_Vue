<script setup>
import { useToast } from '@/composables/useToast.js'

const { toasts, removeToast } = useToast()

const toastClasses = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100',
  error: 'bg-rose-50 border-rose-200 text-rose-800 shadow-rose-100',
  info: 'bg-blue-50 border-blue-200 text-blue-800 shadow-blue-100'
}

const iconClasses = {
  success: 'fa-solid fa-circle-check text-emerald-500 text-base',
  error: 'fa-solid fa-circle-xmark text-rose-500 text-base',
  info: 'fa-solid fa-circle-info text-blue-500 text-base'
}
</script>

<template>
  <div
    class="fixed top-6 right-6 z-[100] flex flex-col space-y-3 pointer-events-none"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'flex items-center space-x-3 px-5 py-4 border rounded-xl shadow-lg pointer-events-auto max-w-sm font-sans',
          toastClasses[toast.type] || toastClasses.info
        ]"
      >
        <i
          :class="iconClasses[toast.type] || iconClasses.info"
        ></i>

        <span class="flex-1 text-sm font-semibold tracking-tight">
          {{ toast.message }}
        </span>

        <button
          type="button"
          class="flex-shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          @click="removeToast(toast.id)"
        >
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.toast-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>