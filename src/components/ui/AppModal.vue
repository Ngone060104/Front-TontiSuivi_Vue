<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  iconClass: { type: String, default: 'bg-emerald-50 text-emerald-600' },
  confirmLabel: { type: String, default: 'Confirmer' },
  cancelLabel: { type: String, default: 'Annuler' },
  confirmClass: { type: String, default: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' },
  loading: { type: Boolean, default: false },
  sansEntete: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'confirm'])

const modalRef = ref(null)
const lastFocused = ref(null)

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  lastFocused.value = document.activeElement
  await nextTick()
  const target = modalRef.value?.querySelector('input, select, textarea, [type=submit]')
  if (target) target.focus()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e) {
  if (e.key === 'Escape') {
    close()
  }
}

function onBackdropClick() {
  close()
}

function close() {
  emit('close')
  nextTick(() => {
    if (lastFocused.value && document.contains(lastFocused.value)) {
      lastFocused.value.focus()
    }
  })
}
</script>

<template>
  <Teleport to="#modalRoot">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      >
        <div
          class="absolute inset-0"
          @click="onBackdropClick"
        ></div>

  <div
  ref="modalRef"
  class="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl bg-white p-6 shadow-2xl animate-fadeIn"
>
          <div v-if="!sansEntete && title" class="mb-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div v-if="icon" class="flex h-11 w-11 items-center justify-center rounded-2xl" :class="iconClass">
                <i :class="icon"></i>
              </div>
              <h3 class="text-xl font-black tracking-tight text-slate-950">{{ title }}</h3>
            </div>
            <button
              class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              @click="$emit('close')"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

         <div class="flex-1 min-h-0 overflow-y-auto p-6">
  <slot></slot>
</div>

          <div v-if="$slots.footer || confirmLabel" class="flex items-center justify-end gap-3">
            <slot name="footer">
              <button
                v-if="cancelLabel"
                class="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                @click="close"
              >
                {{ cancelLabel }}
              </button>
              <button
                :disabled="loading"
                class="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white shadow-lg transition disabled:opacity-50 cursor-pointer"
                :class="[confirmClass, !cancelLabel ? 'w-full justify-center' : '']"
                @click="$emit('confirm')"
              >
                <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
                {{ confirmLabel }}
              </button>
            </slot>
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
