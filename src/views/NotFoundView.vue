<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../i18n/localeConfig.js'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const locale = computed(() => {
  const p = route.params.locale
  return typeof p === 'string' && SUPPORTED_LOCALES.includes(p) ? p : DEFAULT_LOCALE
})

function goHome() {
  router.push({ name: 'home', params: { locale: locale.value } })
}

onMounted(() => {
  document.documentElement.style.setProperty('--nf-hue', `${Math.floor(Math.random() * 360)}`)
})
</script>

<template>
  <div class="nf-page" role="status" aria-live="polite">
    <div class="nf-bg" aria-hidden="true">
      <div class="nf-orb nf-orb--a" />
      <div class="nf-orb nf-orb--b" />
      <div class="nf-grid" />
    </div>

    <div class="nf-card">
      <div class="nf-illu" aria-hidden="true">
        <div class="nf-moon" />
        <div class="nf-telescope">
          <div class="nf-tube" />
          <div class="nf-tripod" />
        </div>
        <div class="nf-star nf-star--1" />
        <div class="nf-star nf-star--2" />
        <div class="nf-star nf-star--3" />
        <div class="nf-cloud nf-cloud--1" />
        <div class="nf-cloud nf-cloud--2" />
      </div>

      <p class="nf-code">404</p>
      <h1 class="nf-title">{{ t('notFound.title') }}</h1>
      <p class="nf-desc">{{ t('notFound.desc') }}</p>
      <el-button type="primary" size="large" round @click="goHome">{{ t('notFound.backHome') }}</el-button>
    </div>
  </div>
</template>

<style scoped>
.nf-page {
  position: relative;
  min-height: min(72vh, 640px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px 48px;
  overflow: hidden;
}

.nf-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 120% 80% at 50% 0%,
    hsla(var(--nf-hue, 210), 85%, 92%, 0.65),
    transparent 55%
  ),
    linear-gradient(180deg, var(--studio-bg, #f5f7fa) 0%, var(--el-bg-color) 100%);
}

.nf-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.55;
  animation: nf-float 8s ease-in-out infinite;
}
.nf-orb--a {
  width: min(42vw, 280px);
  height: min(42vw, 280px);
  background: hsla(calc(var(--nf-hue, 210) + 40), 90%, 70%, 0.5);
  top: 8%;
  left: -5%;
}
.nf-orb--b {
  width: min(36vw, 220px);
  height: min(36vw, 220px);
  background: hsla(calc(var(--nf-hue, 210) + 120), 85%, 65%, 0.45);
  bottom: 5%;
  right: -3%;
  animation-delay: -4s;
}

.nf-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(hsla(220, 15%, 50%, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, hsla(220, 15%, 50%, 0.06) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 70%);
}

.nf-card {
  position: relative;
  z-index: 1;
  max-width: 440px;
  text-align: center;
  padding: 28px 24px 32px;
  border-radius: 20px;
  background: linear-gradient(
    145deg,
    hsla(0, 0%, 100%, 0.92),
    hsla(var(--nf-hue, 210), 40%, 98%, 0.88)
  );
  box-shadow: 0 18px 50px hsla(220, 35%, 20%, 0.12), 0 0 0 1px hsla(220, 25%, 50%, 0.08);
  backdrop-filter: blur(8px);
}

.nf-illu {
  position: relative;
  height: 140px;
  margin: 0 auto 8px;
}

.nf-moon {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
  background: radial-gradient(circle at 32% 28%, #fff9e6, #f0d78c 45%, #c9a227 100%);
  box-shadow: 0 0 40px hsla(45, 90%, 55%, 0.45), inset -8px -6px 16px hsla(35, 60%, 40%, 0.25);
  animation: nf-pulse 3.5s ease-in-out infinite;
}

.nf-telescope {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  animation: nf-sway 4s ease-in-out infinite;
}

.nf-tube {
  width: 120px;
  height: 22px;
  border-radius: 11px;
  background: linear-gradient(180deg, #5a6578, #3d4555);
  box-shadow: inset 0 2px 0 hsla(0, 0%, 100%, 0.15), 0 6px 14px hsla(220, 40%, 15%, 0.35);
  position: relative;
}
.nf-tube::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 26px;
  border-radius: 0 8px 8px 0;
  background: linear-gradient(180deg, #6a7588, #4a5565);
}

.nf-tripod {
  margin: 4px auto 0;
  width: 4px;
  height: 36px;
  background: linear-gradient(180deg, #4a5565, #2c3340);
  border-radius: 2px;
  position: relative;
}
.nf-tripod::before,
.nf-tripod::after {
  content: '';
  position: absolute;
  bottom: 0;
  width: 3px;
  height: 32px;
  background: #3d4555;
  border-radius: 2px;
}
.nf-tripod::before {
  left: -22px;
  transform: rotate(22deg);
  transform-origin: top center;
}
.nf-tripod::after {
  right: -22px;
  transform: rotate(-22deg);
  transform-origin: top center;
}

.nf-star {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 10px hsla(210, 100%, 80%, 0.9);
  animation: nf-twinkle 2.2s ease-in-out infinite;
}
.nf-star--1 {
  left: 12%;
  top: 28%;
  animation-delay: 0s;
}
.nf-star--2 {
  right: 18%;
  top: 40%;
  animation-delay: 0.6s;
}
.nf-star--3 {
  left: 22%;
  bottom: 22%;
  width: 4px;
  height: 4px;
  animation-delay: 1.1s;
}

.nf-cloud {
  position: absolute;
  background: hsla(0, 0%, 100%, 0.55);
  border-radius: 40px;
  filter: blur(0.5px);
  animation: nf-drift 12s linear infinite;
}
.nf-cloud--1 {
  width: 56px;
  height: 18px;
  left: 5%;
  bottom: 8px;
  opacity: 0.85;
}
.nf-cloud--2 {
  width: 44px;
  height: 14px;
  right: 8%;
  top: 24px;
  opacity: 0.65;
  animation-duration: 16s;
  animation-delay: -4s;
}

.nf-code {
  margin: 0 0 4px;
  font-size: clamp(2.5rem, 8vw, 3.25rem);
  font-weight: 800;
  letter-spacing: 0.12em;
  background: linear-gradient(
    135deg,
    hsl(var(--nf-hue, 210), 55%, 42%),
    hsl(calc(var(--nf-hue, 210) + 55), 60%, 52%)
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.1;
}

.nf-title {
  margin: 0 0 10px;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.nf-desc {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--el-text-color-secondary);
}

@keyframes nf-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(12px, -10px) scale(1.04);
  }
}

@keyframes nf-pulse {
  0%,
  100% {
    box-shadow: 0 0 40px hsla(45, 90%, 55%, 0.45), inset -8px -6px 16px hsla(35, 60%, 40%, 0.25);
  }
  50% {
    box-shadow: 0 0 52px hsla(45, 95%, 62%, 0.55), inset -8px -6px 16px hsla(35, 60%, 40%, 0.25);
  }
}

@keyframes nf-sway {
  0%,
  100% {
    transform: translateX(-50%) rotate(-4deg);
  }
  50% {
    transform: translateX(-50%) rotate(4deg);
  }
}

@keyframes nf-twinkle {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes nf-drift {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(18px);
  }
}
</style>
