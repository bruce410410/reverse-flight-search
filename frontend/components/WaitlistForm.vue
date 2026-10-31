<script setup lang="ts">
const props = defineProps<{ source: "rooms" | "premium"; id: string; dark?: boolean }>();
const { t } = useI18n();

const STORAGE_KEY = "smart-traveler:waitlist";
const email = ref("");
const error = ref("");
const doneEmail = ref("");

function onSubmit() {
  const value = email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    error.value = t("waitlist.invalid");
    return;
  }
  error.value = "";
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as { email: string; source: string }[];
    if (!list.some((e) => e.email === value && e.source === props.source)) {
      list.push({ email: value, source: props.source });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // 寫不進 localStorage 也照樣顯示完成訊息；目前沒有後端收件。
  }
  doneEmail.value = value;
  email.value = "";
}
</script>

<template>
  <div class="waitlist">
    <form v-if="!doneEmail" class="pill-form" novalidate @submit.prevent="onSubmit">
      <label :for="id" class="sr-only">{{ t("waitlist.label") }}</label>
      <input
        :id="id"
        v-model="email"
        type="email"
        inputmode="email"
        autocomplete="email"
        :placeholder="t('waitlist.placeholder')"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
      />
      <button type="submit" class="btn btn-ink">{{ t("waitlist.submit") }}</button>
    </form>
    <p v-if="error" :id="`${id}-error`" class="field-error" role="alert">{{ error }}</p>
    <div v-if="doneEmail" class="done" role="status">
      <strong>{{ t("waitlist.done", { email: doneEmail }) }}</strong>
      <span>{{ t("waitlist.localNote") }}</span>
    </div>
  </div>
</template>

<style scoped>
.waitlist {
  width: 100%;
  max-width: 540px;
}
.done {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: 20px;
  padding: 14px 18px;
}
.done span {
  font-size: 14px;
  color: var(--muted);
}
@media (max-width: 420px) {
  .waitlist :deep(.pill-form) {
    flex-direction: column;
    border-radius: 24px;
    align-items: stretch;
    gap: 6px;
  }
  .waitlist :deep(.pill-form .btn) {
    width: 100%;
  }
}
</style>
