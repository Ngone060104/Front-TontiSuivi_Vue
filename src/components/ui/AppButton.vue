<script setup>
defineProps({
  label: { type: String, default: '' },
  type: { type: String, default: 'button' },
  variant: { type: String, default: 'primary' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  icon: { type: String, default: '' }
})

defineEmits(['click'])

const variantClasses = {
  primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200',
  amber: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
  white: 'bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20'
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-extrabold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
      variantClasses[variant] || variantClasses.primary
    ]"
    @click="$emit('click')"
  >
    <i v-if="loading" class="fa-solid fa-spinner fa-spin"></i>
    <i v-else-if="icon" :class="icon"></i>
    <span v-if="label">{{ label }}</span>
  </button>
</template>
