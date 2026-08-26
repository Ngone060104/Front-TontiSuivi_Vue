<script setup>
defineProps({
  kicker: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  actionIcon: { type: String, default: '' }
})

defineEmits(['action'])
</script>

<template>
  <div class="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-900 p-7 text-white shadow-soft sm:p-8 font-sans">
    <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span v-if="kicker" class="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 ring-1 ring-white/15">
          {{ kicker }}
        </span>
        <h1 class="text-3xl font-black tracking-tight sm:text-4xl text-white">{{ title }}</h1>
        <p v-if="subtitle" class="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base" v-html="subtitle"></p>
      </div>
      <div v-if="actionLabel">
        <button
          class="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 shadow-sm cursor-pointer"
          @click="$emit('action')"
        >
          <i v-if="actionIcon" :class="actionIcon"></i>
          {{ actionLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
