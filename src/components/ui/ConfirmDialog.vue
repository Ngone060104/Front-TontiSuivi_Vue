<script setup>
import { useConfirm } from '@/composables/useConfirm.js'

const { confirmState, confirmAction, cancelConfirm } = useConfirm()
</script>

<template>
  <Teleport to="#modalRoot">
    <Transition name="modal">
      <div v-if="confirmState.show" class="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <div class="absolute inset-0" @click="cancelConfirm"></div>

        <div class="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-fadeIn">
          <div class="mb-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100">
                <i class="fa-solid fa-triangle-exclamation text-rose-600"></i>
              </div>
              <h2 class="text-xl font-black tracking-tight text-slate-950">Confirmation</h2>
            </div>
            <button
              class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              @click="cancelConfirm"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="mb-5 max-h-[70vh] overflow-y-auto">
            <p class="text-sm leading-6 text-slate-600">{{ confirmState.message }}</p>
          </div>

          <div class="flex items-center justify-end gap-3">
            <button
              :disabled="confirmState.loading"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              @click="cancelConfirm"
            >
              Annuler
            </button>
            <button
              :disabled="confirmState.loading"
              class="inline-flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-rose-200 transition disabled:opacity-50 cursor-pointer"
              @click="confirmAction"
            >
              <i class="fa-solid fa-check"></i>
              {{ confirmState.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
