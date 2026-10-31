<script setup lang="ts">
const { t } = useI18n();
useHead({ title: () => t("settings.label") });

const { apiKey, save } = useGoogleMapsKey();
const draft = ref("");
const reveal = ref(false);
type Msg = { kind: "ok" | "error" | "info"; text: string } | null;
const message = ref<Msg>(null);
const testing = ref(false);

watch(apiKey, (v) => (draft.value = v), { immediate: true });

function onSave() {
  save(draft.value);
  message.value = draft.value.trim()
    ? { kind: "ok", text: t("settings.saved") }
    : { kind: "info", text: t("settings.cleared") };
}

function onClear() {
  draft.value = "";
  save("");
  message.value = { kind: "info", text: t("settings.cleared") };
}

/** 用最小的 computeRoutes 請求（台北車站 → 台北 101）確認 Key 能呼叫 Routes API。 */
async function onTest() {
  const key = draft.value.trim();
  if (!key) {
    message.value = { kind: "error", text: t("settings.testNeedKey") };
    return;
  }
  testing.value = true;
  message.value = { kind: "info", text: t("settings.testing") };
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: 25.0478, longitude: 121.517 } } },
        destination: { location: { latLng: { latitude: 25.0339, longitude: 121.5645 } } },
        travelMode: "WALK",
      }),
    });
    if (res.ok) {
      message.value = { kind: "ok", text: t("settings.testOk") };
    } else {
      const body = await res.json().catch(() => null);
      message.value = {
        kind: "error",
        text: t("settings.testFail", { msg: body?.error?.message ?? `HTTP ${res.status}` }),
      };
    }
  } catch (e) {
    message.value = { kind: "error", text: t("settings.testFail", { msg: (e as Error).message }) };
  } finally {
    testing.value = false;
  }
}

const isSet = computed(() => !!apiKey.value);

const LINKS = {
  console: "https://console.cloud.google.com/projectcreate",
  billing: "https://console.cloud.google.com/billing",
  routes: "https://console.cloud.google.com/apis/library/routes.googleapis.com",
  staticMaps: "https://console.cloud.google.com/apis/library/static-maps-backend.googleapis.com",
  streetView: "https://console.cloud.google.com/apis/library/maps-javascript-api.googleapis.com",
  credentials: "https://console.cloud.google.com/apis/credentials",
  quotas: "https://console.cloud.google.com/google/maps-apis/quotas",
};
</script>

<template>
  <div>
    <section class="container hero">
      <div class="hero-left">
        <SectionLabel en="SETTINGS" :local="t('settings.label')" dot="#a2c5c9" />
        <h1 class="hero-title">
          <span class="rise-line"><span>{{ t("settings.title1") }}</span></span>
          <span class="rise-line"><span>{{ t("settings.title2") }}</span></span>
        </h1>
      </div>
      <p class="lead hero-lead">{{ t("settings.lead") }}</p>
    </section>

    <section class="container body">
      <div class="col">
        <form class="key-card" novalidate @submit.prevent="onSave">
          <div class="key-head">
            <h2>{{ t("settings.yourKey") }}</h2>
            <span class="state" :class="{ on: isSet }">
              <span class="state-dot" :class="{ 'a-blink': !isSet }" />
              {{ isSet ? t("settings.set") : t("settings.unset") }}
            </span>
          </div>
          <label for="k-input" class="key-label">{{ t("settings.inputLabel") }}</label>
          <div class="input-wrap">
            <input
              id="k-input"
              v-model="draft"
              :type="reveal ? 'text' : 'password'"
              class="key-input mono"
              autocomplete="off"
              spellcheck="false"
              :placeholder="t('settings.placeholder')"
              @input="message = null"
            />
            <button type="button" class="toggle" :aria-pressed="reveal" @click="reveal = !reveal">
              {{ reveal ? t("settings.hide") : t("settings.show") }}
            </button>
          </div>
          <div class="actions">
            <button type="submit" class="btn btn-coral">{{ t("settings.save") }}</button>
            <button type="button" class="btn btn-white" :disabled="testing" @click="onTest">
              {{ testing ? t("settings.testing") : t("settings.test") }}
            </button>
            <button type="button" class="link-btn" @click="onClear">{{ t("settings.clear") }}</button>
          </div>
          <p v-if="message" class="msg" :class="`msg-${message.kind}`" role="status">{{ message.text }}</p>
        </form>

        <div v-reveal="0.1" class="local-card">
          <IllusLock class="lock" />
          <div class="local-text">
            <strong>{{ t("settings.localTitle") }}</strong>
            <span>{{ t("settings.localBody") }}</span>
          </div>
        </div>

        <div v-reveal="0.2" class="nokey">
          <div>
            <strong>{{ t("settings.noKeyTitle") }}</strong>
            <div class="muted">{{ t("settings.noKeyBody") }}</div>
          </div>
          <NuxtLink to="/plans" class="more">{{ t("settings.noKeyLink") }}<span class="more-arrow" aria-hidden="true">→</span></NuxtLink>
        </div>
      </div>

      <div v-reveal="0.15" class="guide">
        <div class="guide-head">
          <h2>{{ t("settings.guideTitle") }}</h2>
          <span class="display steps-tag">{{ t("settings.guideSteps") }}</span>
        </div>
        <ol class="steps">
          <li>
            <div class="rail"><span class="num" style="background: #e36255">1</span><span class="dash" /></div>
            <div class="step-body">
              <strong>{{ t("settings.s1Title") }}</strong>
              <span class="muted">
                {{ t("settings.s1Pre") }}
                <a :href="LINKS.console" target="_blank" rel="noopener">{{ t("settings.s1Link") }}</a>{{ t("settings.s1Post") }}
              </span>
            </div>
          </li>
          <li>
            <div class="rail"><span class="num" style="background: #f3c262">2</span><span class="dash" /></div>
            <div class="step-body">
              <strong><a :href="LINKS.billing" target="_blank" rel="noopener" class="title-link">{{ t("settings.s2Title") }}</a></strong>
              <span class="muted">{{ t("settings.s2Body") }}</span>
            </div>
          </li>
          <li>
            <div class="rail"><span class="num" style="background: #a2c5c9">3</span><span class="dash" /></div>
            <div class="step-body">
              <strong>{{ t("settings.s3Title") }}</strong>
              <span class="muted">{{ t("settings.s3Body") }}</span>
              <div class="api-chips">
                <a :href="LINKS.routes" target="_blank" rel="noopener" class="chip">Routes API ↗</a>
                <a :href="LINKS.staticMaps" target="_blank" rel="noopener" class="chip">Maps Static API ↗</a>
                <a :href="LINKS.streetView" target="_blank" rel="noopener" class="chip">Maps JavaScript API ↗</a>
              </div>
            </div>
          </li>
          <li>
            <div class="rail"><span class="num" style="background: #ec9a86">4</span><span class="dash" /></div>
            <div class="step-body">
              <strong>{{ t("settings.s4Title") }}</strong>
              <span class="muted">
                {{ t("settings.s4Pre") }}
                <a :href="LINKS.credentials" target="_blank" rel="noopener">{{ t("settings.s4Link") }}</a>{{ t("settings.s4Post") }}
              </span>
            </div>
          </li>
          <li>
            <div class="rail"><span class="num num-dark">5</span></div>
            <div class="step-body">
              <strong>{{ t("settings.s5Title") }}</strong>
              <span class="muted">{{ t("settings.s5Body") }}</span>
            </div>
          </li>
        </ol>
        <a :href="LINKS.quotas" target="_blank" rel="noopener" class="tip">{{ t("settings.tip") }} ↗</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  padding-top: clamp(40px, 6vw, 56px);
  padding-bottom: 32px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.hero-left {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.hero-title {
  margin: 0;
  font-size: clamp(32px, 5vw, 60px);
  line-height: 1.15;
  font-weight: 900;
  overflow-wrap: anywhere;
}
.hero-lead {
  max-width: 400px;
}
.body {
  padding-top: 24px;
  padding-bottom: clamp(48px, 7vw, 80px);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr));
  gap: 32px;
  align-items: start;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
.key-card {
  background: var(--white);
  border: 3px solid var(--ink);
  border-radius: var(--radius-lg);
  padding: clamp(22px, 3.4vw, 32px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 8px 8px 0 var(--ink);
}
.key-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.key-head h2 {
  margin: 0;
  font-size: 22px;
}
.state {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 900;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--cream);
  border: 2px solid var(--ink);
}
.state-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--coral);
}
.state.on {
  background: var(--sage);
}
.state.on .state-dot {
  background: var(--ok);
}
.key-label {
  font-weight: 700;
}
.input-wrap {
  position: relative;
}
.key-input {
  width: 100%;
  height: 58px;
  border: 2px solid var(--ink);
  border-radius: 16px;
  padding: 0 84px 0 18px;
  font-size: 16px;
  background: var(--cream);
  color: var(--ink);
}
.toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  height: 40px;
  min-width: 64px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: var(--white);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.btn-white {
  border: 2px solid var(--ink);
}
.link-btn {
  height: 52px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--accent-text);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
.msg {
  margin: 0;
  padding: 10px 14px;
  border-radius: 14px;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.msg-ok {
  background: var(--sage);
}
.msg-info {
  background: var(--cream);
}
.msg-error {
  background: var(--rose-tint);
  color: var(--accent-text);
}
.local-card {
  background: var(--sage);
  border: 3px solid var(--ink);
  border-radius: var(--radius-lg);
  padding: clamp(20px, 3vw, 28px);
  display: flex;
  gap: 22px;
  align-items: center;
}
.lock {
  width: 120px;
  flex: none;
}
.local-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.local-text strong {
  font-size: 19px;
}
.nokey {
  border: 2px dashed var(--ink);
  border-radius: 28px;
  padding: 24px 28px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}
.nokey strong {
  font-size: 18px;
}
.muted {
  color: var(--muted);
}

.guide {
  background: var(--white);
  border: 3px solid var(--ink);
  border-radius: var(--radius-lg);
  padding: clamp(22px, 3.4vw, 32px) clamp(20px, 3.6vw, 36px);
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
.guide-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.guide-head h2 {
  margin: 0;
  font-size: clamp(22px, 2.6vw, 26px);
}
.steps-tag {
  color: var(--accent-text);
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
}
.steps li {
  display: flex;
  gap: 18px;
}
.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.num {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 20px;
  flex: none;
}
.num-dark {
  background: var(--ink);
  color: var(--cream);
}
.dash {
  flex: 1;
  width: 0;
  border-left: 3px dashed var(--ink);
  margin: 6px 0;
}
.step-body {
  padding-bottom: 26px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.step-body strong {
  font-size: clamp(18px, 2vw, 20px);
}
.step-body a {
  font-weight: 700;
}
.title-link {
  text-decoration-thickness: 2px;
}
.api-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.api-chips .chip {
  text-decoration: none;
}
.tip {
  display: block;
  background: var(--mustard);
  border-radius: 18px;
  padding: 14px 18px;
  font-weight: 700;
  text-decoration: none;
}
@media (max-width: 480px) {
  .local-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .lock {
    width: 96px;
  }
  .steps li {
    gap: 12px;
  }
  .num {
    width: 40px;
    height: 40px;
    font-size: 17px;
  }
}
</style>
