<script setup lang="ts">
import { AIRPORTS } from "~/utils/airports";

const props = defineProps<{ id: string; placeholder: string; label: string }>();
const model = defineModel<string>({ required: true });
const { locale } = useI18n();

const listId = computed(() => `${props.id}-list`);
const options = computed(() => AIRPORTS.map((a) => ({ value: `${a.names[locale.value]} (${a.iata})`, iata: a.iata })));
</script>

<template>
  <label :for="id" class="sr-only">{{ label }}</label>
  <input
    :id="id"
    v-model="model"
    type="text"
    :list="listId"
    :placeholder="placeholder"
    autocomplete="off"
    autocapitalize="characters"
    enterkeyhint="search"
    required
    v-bind="$attrs"
  />
  <datalist :id="listId">
    <option v-for="o in options" :key="o.iata" :value="o.value" />
  </datalist>
</template>
