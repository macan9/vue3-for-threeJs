<template>
  <div class="three-island-page">
    <div class="three-island-shell">
      <div class="three-island-head">
        <p class="three-island-eyebrow">Island Scene</p>
        <h2>海岛场景演示</h2>
      </div>

      <div class="three-loading" :class="{ 'is-hidden': !isLoading }">
        <div class="three-loading-spinner"></div>
        <p>正在加载海岛场景...</p>
      </div>

      <div ref="mountEl" class="webThree" :class="{ 'is-ready': !isLoading }">
        <div class="ulBox">
          <div ref="textEl" class="liBox"></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { islandInit } from './utils/heka.js'
import { onMounted, onUnmounted, ref } from 'vue'

const mountEl = ref(null)
const textEl = ref(null)
const isLoading = ref(true)
let islandRuntime = null

onMounted(() => {
  islandRuntime = islandInit({
    mountEl,
    textEl,
    onReady: () => {
      isLoading.value = false
    },
  })
})

onUnmounted(() => {
  islandRuntime?.destroy()
  islandRuntime = null
})
</script>
<style lang="scss">
.three-island-page {
  width: 100%;
  height: 100%;
}

.three-island-shell {
  position: relative;
  height: 100%;
  padding: 18px;
  border: 1px solid rgba(198, 213, 225, 0.9);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(243, 247, 252, 0.78));
  box-shadow: 0 18px 40px rgba(111, 144, 176, 0.12);
  box-sizing: border-box;
  overflow: hidden;
}

.three-loading {
  position: absolute;
  inset: 18px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top, rgba(125, 211, 252, 0.16), transparent 34%),
    rgba(2, 6, 23, 0.88);
  color: #e2e8f0;
  transition: opacity 0.35s ease, visibility 0.35s ease;
}

.three-loading.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.three-loading-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(255, 255, 255, 0.18);
  border-top-color: #7dd3fc;
  border-radius: 50%;
  animation: three-spin 0.9s linear infinite;
}

.three-island-head {
  position: absolute;
  top: 28px;
  left: 28px;
  z-index: 3;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(7, 16, 30, 0.28);
  backdrop-filter: blur(12px);
  color: #eff6ff;
}

.three-island-head h2 {
  margin: 4px 0 0;
  font-size: 28px;
  line-height: 1.15;
}

.three-island-eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.webThree {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 20px;
  background: #020617;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.webThree.is-ready {
  opacity: 1;
}

.webThree canvas {
  display: block;
}

.ulBox {
  position: absolute;
  top: 92px;
  left: 0;
  width: 100%;
  height: 60px;
  overflow: hidden;
  z-index: 2;
  pointer-events: none;
}

.liBox {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transition: top 1s ease;
}

.liBox h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(28px, 4vw, 50px);
  line-height: 60px;
  padding-left: 30px;
  text-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

@media (max-width: 768px) {
  .three-island-shell {
    padding: 12px;
    border-radius: 18px;
  }

  .three-island-head {
    top: 18px;
    left: 18px;
    max-width: calc(100% - 36px);
  }

  .three-island-head h2 {
    font-size: 22px;
  }

  .ulBox {
    top: 84px;
  }

  .liBox h1 {
    padding-left: 18px;
  }

  .three-loading {
    inset: 12px;
    border-radius: 16px;
  }
}

@keyframes three-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
