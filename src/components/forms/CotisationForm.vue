<script setup>
import { ref, computed, onMounted } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps({
  participant: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['submit', 'cancel'])

const MONTANT_COTISATION = 200
const MONTANT_EPARGNE_MIN = 1000

const inclureCotisation = ref(true)
const dateMercredi = ref('')
const selectedMonth = ref(1)

const inclureEpargne = ref(false)
const montantEpargne = ref('')
const epargneError = ref('')

const errors = ref({})

const moisDisponibles = computed(() => {
  const currentYear = new Date().getFullYear()
  const mois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  return mois.map((m, index) => ({
    value: index + 1,
    label: `${m} ${currentYear}`
  }))
})

const mercredis = computed(() => {
  const monthIndex = selectedMonth.value - 1
  const year = new Date().getFullYear()
  const dates = []
  const date = new Date(year, monthIndex, 1)

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === 3) {
      const dateStr = date.toISOString().split('T')[0]
      const display = date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      dates.push({
        value: dateStr,
        label: `Mercredi ${display}`
      })
    }
    date.setDate(date.getDate() + 1)
  }

  return dates
})

const infoPeriode = computed(() => {
  return new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
})

function onMonthChange() {
  dateMercredi.value = ''
  autoSelectTodayWednesday()
}

function autoSelectTodayWednesday() {
  const today = new Date()
  if (selectedMonth.value === today.getMonth() + 1) {
    const todayStr = today.toISOString().split('T')[0]
    const todayWed = mercredis.value.find(m => m.value === todayStr)
    if (todayWed) {
      dateMercredi.value = todayWed.value
    }
  }
}

function valider() {
  errors.value = {}
  epargneError.value = ''

  if (!inclureCotisation.value && !inclureEpargne.value) {
    errors.value.general = 'Sélectionnez au moins une option (cotisation ou épargne)'
  }

  if (inclureCotisation.value) {
    if (!dateMercredi.value) {
      errors.value.date = 'Veuillez sélectionner une date'
    }
  }

  if (inclureEpargne.value) {
    const val = parseInt(montantEpargne.value) || 0
    if (val <= 0) {
      epargneError.value = 'Veuillez saisir un montant'
    } else if (val % MONTANT_EPARGNE_MIN !== 0) {
      epargneError.value = `L'épargne doit être un multiple de ${MONTANT_EPARGNE_MIN} FCFA.`
    }
  }

  return Object.keys(errors.value).length === 0 && !epargneError.value
}

function onSubmit() {
  if (valider()) {
    emit('submit', {
      inclureCotisation: inclureCotisation.value,
      date_mercredi: dateMercredi.value,
      montant: MONTANT_COTISATION,
      inclureEpargne: inclureEpargne.value,
      montantEpargne: parseInt(montantEpargne.value) || 0
    })
  }
}

onMounted(() => {
  selectedMonth.value = new Date().getMonth() + 1
  autoSelectTodayWednesday()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Section 2: Saisie du versement -->
    <div class="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-5">
      <p class="text-xs font-black text-emerald-600 uppercase tracking-wider mb-4">
        <i class="fa-solid fa-calendar-days mr-2 text-emerald-500"></i>
        2. Saisie du versement
      </p>

      <!-- Cotisation Obligatoire -->
      <div class="bg-white rounded-xl p-4 border border-slate-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-bold text-slate-700 text-sm">Cotisation Obligatoire</p>
            <p class="text-[10px] text-slate-400">Fond commun de {{ MONTANT_COTISATION }} F</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-black text-slate-800">{{ MONTANT_COTISATION }} FCFA</span>
            <input
              id="inclureCotisation"
              v-model="inclureCotisation"
              type="checkbox"
              class="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div v-if="inclureCotisation" class="mt-4 space-y-3">
        <label class="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Choisir du Mercredi d'opération *
        </label>

        <select
          v-model="selectedMonth"
          class="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-emerald-500"
          @change="onMonthChange"
        >
          <option v-for="mois in moisDisponibles" :key="mois.value" :value="mois.value">
            {{ mois.label }}
          </option>
        </select>

        <select
          v-model="dateMercredi"
          class="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-emerald-500"
        >
          <option v-if="mercredis.length === 0" value="">Aucun mercredi ce mois</option>
          <option v-for="m in mercredis" :key="m.value" :value="m.value">
            {{ m.label }}
          </option>
        </select>

        <p v-if="errors.date" class="text-xs text-rose-500">{{ errors.date }}</p>

        <p class="text-[10px] text-slate-400 font-medium">
          <i class="fa-regular fa-calendar mr-1"></i>
          Cotisations de {{ infoPeriode }}
        </p>
      </div>

      <div v-if="inclureCotisation" class="mt-4">
        <label class="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
          Montant à Enregistrer (FCFA)
        </label>
        <input
          type="number"
          :value="MONTANT_COTISATION"
          readonly
          class="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-500 outline-none cursor-not-allowed"
        />
        <p class="text-[10px] text-slate-400 mt-1">
          <i class="fa-regular fa-circle-info mr-1"></i>
          Le montant de cotisation commune est fixé à {{ MONTANT_COTISATION }} FCFA et ne peut pas être modifié.
        </p>
      </div>
    </div>

    <p v-if="errors.general" class="text-xs text-rose-500">{{ errors.general }}</p>

    <!-- Épargne Libre -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-bold text-slate-700 text-sm">Épargne Libre</p>
          <p class="text-[10px] text-slate-400">Multiple de {{ MONTANT_EPARGNE_MIN }} F</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-black text-emerald-600">
            {{ (parseInt(montantEpargne) || 0).toLocaleString('fr-FR') }} FCFA
          </span>
          <input
            id="inclureEpargne"
            v-model="inclureEpargne"
            type="checkbox"
            class="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        </div>
      </div>
      <div v-if="inclureEpargne" class="mt-3">
        <input
          v-model="montantEpargne"
          type="number"
          :placeholder="`Montant (multiple de ${MONTANT_EPARGNE_MIN})`"
          min="0"
          class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-emerald-500"
        />
        <p v-if="epargneError" class="text-xs text-rose-500 font-semibold mt-1">{{ epargneError }}</p>
      </div>
    </div>

    <!-- Contenu additionnel (ex: historique) injecté par le parent, avant les boutons -->
    <slot name="before-actions"></slot>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3">
      <AppButton label="Annuler" variant="secondary" @click="$emit('cancel')" />
      <AppButton
        label="Enregistrer"
        :loading="loading"
        icon="fa-solid fa-check"
        @click="onSubmit"
      />
    </div>

  </div>
</template>