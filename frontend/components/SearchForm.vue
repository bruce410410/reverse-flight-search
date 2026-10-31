<script setup lang="ts">
import type { ReverseSearchFormState } from "~/types/reverseSearch";

/** 結果頁上方的搜尋列：目的地、日期區間、單程／來回、幣別。 */
const props = defineProps<{
  modelValue: ReverseSearchFormState;
  loading: boolean;
  fieldErrors: { path: string; message: string }[];
}>();

const emit = defineEmits<{
  "update:modelValue": [ReverseSearchFormState];
  submit: [];
}>();

const { t } = useI18n();

const form = computed({
  get: () => props.modelValue,
  set: (value: ReverseSearchFormState) => emit("update:modelValue", value),
});

function patch(partial: Partial<ReverseSearchFormState>) {
  form.value = { ...form.value, ...partial };
}

function fieldError(path: string): string | undefined {
  return props.fieldErrors.find((e) => e.path === path)?.message;
}

const todayIso = new Date().toISOString().slice(0, 10);
const currencies = ["TWD", "USD", "JPY", "KRW", "HKD", "EUR"];
</script>

<template>
  <form class="search" novalidate @submit.prevent="emit('submit')">
    <div class="trip" role="group" :aria-label="t('results.tripType')">
      <button
        type="button"
        class="trip-btn"
        :aria-pressed="form.tripType === 'one-way'"
        @click="patch({ tripType: 'one-way' })"
      >
        {{ t("results.oneWay") }}
      </button>
      <button
        type="button"
        class="trip-btn"
        :aria-pressed="form.tripType === 'round-trip'"
        @click="patch({ tripType: 'round-trip' })"
      >
        {{ t("results.roundTrip") }}
      </button>
    </div>

    <div class="bar">
      <div class="cell cell-dest">
        <span class="cell-label" aria-hidden="true">{{ t("results.dest") }}</span>
        <DestinationField
          id="search-dest"
          :model-value="form.destination"
          class="cell-input"
          :label="t('results.dest')"
          :placeholder="t('flights.hero.placeholder')"
          @update:model-value="(v: string) => patch({ destination: v })"
        />
        <p v-if="fieldError('destination')" class="field-error">{{ fieldError("destination") }}</p>
      </div>
      <label class="cell">
        <span class="cell-label">{{ t("results.dateFrom") }}</span>
        <input
          type="date"
          class="cell-input"
          :min="todayIso"
          :value="form.dateFrom"
          required
          @input="patch({ dateFrom: ($event.target as HTMLInputElement).value })"
        />
        <span v-if="fieldError('dateFrom')" class="field-error">{{ fieldError("dateFrom") }}</span>
      </label>
      <label class="cell">
        <span class="cell-label">{{ t("results.dateTo") }}</span>
        <input
          type="date"
          class="cell-input"
          :min="form.dateFrom || todayIso"
          :value="form.dateTo"
          required
          @input="patch({ dateTo: ($event.target as HTMLInputElement).value })"
        />
        <span v-if="fieldError('dateTo')" class="field-error">{{ fieldError("dateTo") }}</span>
      </label>
      <template v-if="form.tripType === 'round-trip'">
        <label class="cell">
          <span class="cell-label">{{ t("results.returnFrom") }}</span>
          <input
            type="date"
            class="cell-input"
            :min="form.dateTo || todayIso"
            :value="form.returnDateFrom"
            required
            @input="patch({ returnDateFrom: ($event.target as HTMLInputElement).value })"
          />
          <span v-if="fieldError('returnDateFrom')" class="field-error">{{ fieldError("returnDateFrom") }}</span>
        </label>
        <label class="cell">
          <span class="cell-label">{{ t("results.returnTo") }}</span>
          <input
            type="date"
            class="cell-input"
            :min="form.returnDateFrom || form.dateTo || todayIso"
            :value="form.returnDateTo"
            required
            @input="patch({ returnDateTo: ($event.target as HTMLInputElement).value })"
          />
          <span v-if="fieldError('returnDateTo')" class="field-error">{{ fieldError("returnDateTo") }}</span>
        </label>
      </template>
      <label class="cell cell-cur">
        <span class="cell-label">{{ t("results.currency") }}</span>
        <select class="cell-input" :value="form.currency" @change="patch({ currency: ($event.target as HTMLSelectElement).value })">
          <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <button type="submit" class="submit" :disabled="loading">
        {{ loading ? t("results.searching") : t("results.submit") }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.search {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.trip {
  align-self: flex-end;
  display: flex;
  background: var(--cream);
  border: 2px solid var(--ink);
  border-radius: 4px;
  padding: 4px;
}
.trip-btn {
  border: 0;
  background: transparent;
  border-radius: 3px;
  padding: 6px 18px;
  font-weight: 700;
  cursor: pointer;
}
.trip-btn[aria-pressed="true"] {
  background: var(--ink);
  color: var(--cream);
}
.bar {
  display: flex;
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: 4px;
  overflow: hidden;
}
.cell {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 18px;
  border-right: 2px solid var(--ink);
}
.cell-dest {
  flex: 1.6 1 0;
}
.cell-cur {
  flex: 0 0 120px;
}
.cell-label {
  font-size: 12px;
  font-weight: 900;
  color: var(--accent-text);
}
.cell-input,
.cell :deep(.cell-input) {
  width: 100%;
  min-width: 0;
  border: 0;
  padding: 2px 0;
  font-size: 17px;
  font-weight: 700;
  background: transparent;
  color: var(--ink);
}
.cell-input:focus,
.cell :deep(.cell-input:focus) {
  outline: none;
}
.cell:focus-within {
  background: var(--rose-tint);
}
.submit {
  flex: 0 0 auto;
  padding: 0 30px;
  border: 0;
  background: var(--ink);
  color: var(--mustard);
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
}
.submit:disabled {
  opacity: 0.7;
  cursor: progress;
}
@media (max-width: 900px) {
  .bar {
    flex-wrap: wrap;
  }
  .cell {
    flex: 1 1 calc(50% - 2px);
    border-bottom: 2px solid var(--ink);
  }
  .cell-dest {
    flex-basis: 100%;
    border-right: 0;
  }
  .cell-cur {
    flex: 1 1 calc(50% - 2px);
  }
  .submit {
    flex: 1 1 100%;
    min-height: 56px;
  }
}
@media (max-width: 480px) {
  .trip {
    align-self: stretch;
  }
  .trip-btn {
    flex: 1;
  }
  .cell {
    flex-basis: 100%;
    border-right: 0;
  }
}
</style>
