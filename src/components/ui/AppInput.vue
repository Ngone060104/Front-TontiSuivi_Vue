<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  icon: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'input', 'change'])

function onInput(event) {
  emit('update:modelValue', event.target.value)
  emit('input', event)
}

function onChange(event) {
  emit('change', event)
}
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
      {{ label }}
      <span v-if="required" class="text-rose-500">*</span>
    </label>
    <div class="relative">
      <span v-if="icon" class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
        <i :class="[icon, 'text-sm']"></i>
      </span>
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="[
          'w-full bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all',
          icon ? 'pl-11 pr-4 py-3.5' : 'px-4 py-2.5',
          error
            ? 'border-rose-300 focus:border-rose-500'
            : '',
          disabled ? 'bg-slate-50 cursor-not-allowed opacity-60' : ''
        ]"
        @input="onInput"
        @change="onChange"
      />
    </div>
    <p v-if="error" class="mt-1 text-[10px] text-rose-500 font-semibold">{{ error }}</p>
  </div>
</template>
