<script setup>
defineProps({
  columns: {
    type: Array,
    default: () => []
  },
  rows: {
    type: Array,
    default: () => []
  },
  emptyMessage: {
    type: String,
    default: 'Aucune donnée disponible'
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['rowClick'])
</script>

<template>
  <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse">
        <thead>
          <tr class="bg-slate-50">
            <th
              v-for="col in columns"
              :key="col.key"
              class="whitespace-nowrap px-5 py-4 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length" class="px-5 py-10 text-center">
              <div class="text-slate-400 animate-pulse">
                <i class="fa-solid fa-spinner fa-spin mr-2"></i> Chargement...
              </div>
            </td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td :colspan="columns.length" class="px-5 py-10">
              <div class="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm font-semibold text-slate-500">
                <i class="fa-solid fa-inbox text-3xl text-slate-300 mb-3 block mx-auto"></i>
                {{ emptyMessage }}
              </div>
            </td>
          </tr>
          <tr
            v-else
            v-for="(row, index) in rows"
            :key="row.id || index"
            class="transition hover:bg-slate-50 cursor-pointer"
            @click="$emit('rowClick', row)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="border-t border-slate-100 px-5 py-4 align-middle text-sm text-slate-700"
            >
              <slot :name="col.key" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
