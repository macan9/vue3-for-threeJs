<template>
  <section
    class="fireworks-page home-view-page"
    @dblclick="handleBurst"
  >
    <img
      class="fireworks-bg"
      :src="backgroundImage"
      alt="background"
    >

    <canvas
      ref="canvasRef"
      class="fireworks-canvas"
      @pointerdown="handleLaunch"
    />

    <div class="fireworks-mask" />
    
  </section>
</template>

<script>
export default {
  name: 'FireworksView',
}
</script>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref(null)
const rocketsCount = ref(0)
const particlesCount = ref(0)
const autoLaunch = ref(true)
const backgroundImage = computed(() => `${process.env.BASE_URL}img/background/bg.png`)

const rockets = []
const particles = []
const maxParticles = 600
const explosionColors = [12, 24, 36, 48, 195, 210, 280, 320]

let context = null
let animationFrameId = 0
let autoLaunchTimer = 0
let resizeHandler = null
let screenWidth = 0
let screenHeight = 0

const autoLaunchInterval = computed(() => 780)

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

class Particle {
  constructor(position = { x: 0, y: 0 }) {
    this.pos = {
      x: position.x,
      y: position.y,
    }
    this.vel = {
      x: 0,
      y: 0,
    }
    this.shrink = 0.97
    this.size = 2
    this.resistance = 1
    this.gravity = 0
    this.flick = false
    this.alpha = 1
    this.fade = 0
    this.color = 0
  }

  update() {
    this.vel.x *= this.resistance
    this.vel.y *= this.resistance
    this.vel.y += this.gravity

    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.size *= this.shrink
    this.alpha -= this.fade
  }

  render(ctx) {
    if (!this.exists()) return

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    const radius = this.flick ? Math.random() * this.size : this.size
    const gradient = ctx.createRadialGradient(
      this.pos.x,
      this.pos.y,
      0.1,
      this.pos.x,
      this.pos.y,
      radius
    )

    gradient.addColorStop(0.1, `rgba(255, 255, 255, ${this.alpha})`)
    gradient.addColorStop(0.8, `hsla(${this.color}, 100%, 58%, ${this.alpha})`)
    gradient.addColorStop(1, `hsla(${this.color}, 100%, 58%, 0.08)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.pos.x, this.pos.y, radius, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  exists() {
    return this.alpha >= 0.1 && this.size >= 1
  }
}

class Rocket extends Particle {
  constructor(x) {
    super({
      x,
      y: screenHeight + 20,
    })

    this.explosionColor = randomFrom(explosionColors)
  }

  explode() {
    // 主体功能备注：
    // 这里延续旧版“火箭升空后在空中裂变为大量粒子”的核心机制，
    // 但不再依赖 jQuery 插件上下文，而是由组件内部统一维护状态。
    const count = Math.round(randomBetween(72, 110))

    for (let i = 0; i < count; i += 1) {
      const particle = new Particle(this.pos)
      const angle = Math.random() * Math.PI * 2
      const speed = Math.cos(Math.random() * Math.PI / 2) * randomBetween(8, 16)

      particle.vel.x = Math.cos(angle) * speed
      particle.vel.y = Math.sin(angle) * speed
      particle.size = randomBetween(6, 10)
      particle.gravity = 0.2
      particle.resistance = 0.92
      particle.shrink = randomBetween(0.93, 0.97)
      particle.fade = randomBetween(0.012, 0.022)
      particle.flick = true
      particle.color = this.explosionColor

      particles.push(particle)
    }
  }
}

function syncCounters() {
  rocketsCount.value = rockets.length
  particlesCount.value = particles.length
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !context) return

  const dpr = window.devicePixelRatio || 1
  screenWidth = window.innerWidth
  screenHeight = window.innerHeight

  canvas.width = Math.round(screenWidth * dpr)
  canvas.height = Math.round(screenHeight * dpr)

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function launchRocket(x = Math.random() * screenWidth) {
  if (!screenWidth || rockets.length >= 12) return

  const rocket = new Rocket(x)
  rocket.vel.y = randomBetween(-10, -6.5)
  rocket.vel.x = randomBetween(-3, 3)
  rocket.size = randomBetween(5, 7)
  rocket.shrink = 0.999
  rocket.gravity = 0.03
  rocket.resistance = 0.995

  rockets.push(rocket)
  syncCounters()
}

function launchBurst() {
  const center = screenWidth / 2
  const offsets = [-120, -60, 0, 60, 120]

  offsets.forEach((offset) => {
    launchRocket(center + offset)
  })
}

function clearScene() {
  if (!context) return

  // 主体功能备注：
  // 这里不做纯黑清屏，而是覆盖一层半透明深色，让烟花拥有连续拖尾和残影效果。
  context.fillStyle = 'rgba(4, 8, 18, 0.08)'
  context.fillRect(0, 0, screenWidth, screenHeight)
}

function updateRockets() {
  const aliveRockets = []

  rockets.forEach((rocket) => {
    rocket.update()
    rocket.render(context)

    const shouldExplode =
      rocket.pos.y < screenHeight / 5 ||
      rocket.vel.y >= 0 ||
      Math.random() <= 0.01

    if (shouldExplode) {
      rocket.explode()
    } else if (rocket.exists()) {
      aliveRockets.push(rocket)
    }
  })

  rockets.length = 0
  rockets.push(...aliveRockets)
}

function updateParticles() {
  const aliveParticles = []

  particles.forEach((particle) => {
    particle.update()

    if (particle.exists()) {
      particle.render(context)
      aliveParticles.push(particle)
    }
  })

  particles.length = 0
  particles.push(...aliveParticles.slice(-maxParticles))
}

function animate() {
  clearScene()
  updateRockets()
  updateParticles()
  syncCounters()

  animationFrameId = window.requestAnimationFrame(animate)
}

function restartAutoLaunch() {
  if (autoLaunchTimer) {
    window.clearInterval(autoLaunchTimer)
    autoLaunchTimer = 0
  }

  if (!autoLaunch.value) return

  autoLaunchTimer = window.setInterval(() => {
    launchRocket()
  }, autoLaunchInterval.value)
}

function handleLaunch(event) {
  const x = event.clientX
  launchRocket(x)

  if (Math.random() > 0.45) {
    launchRocket(x + randomBetween(-40, 40))
  }
}

function handleBurst() {
  launchBurst()
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  context = canvas.getContext('2d')
  resizeCanvas()

  context.fillStyle = 'rgba(4, 8, 18, 1)'
  context.fillRect(0, 0, screenWidth, screenHeight)

  resizeHandler = () => resizeCanvas()
  window.addEventListener('resize', resizeHandler)

  restartAutoLaunch()
  animate()
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
  }

  if (autoLaunchTimer) {
    window.clearInterval(autoLaunchTimer)
  }

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
})
</script>

<style lang="scss" scoped>
.fireworks-page {
  position: relative;
  height: 100%;
  overflow: hidden;
  background-color: #040812;
}

.fireworks-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
}

.fireworks-canvas,
.fireworks-mask {
  position: absolute;
  inset: 0;
}

.fireworks-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.fireworks-mask {
  pointer-events: none;
  background:
    radial-gradient(circle at top, rgba(255, 204, 124, 0.14), transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(71, 135, 255, 0.16), transparent 24%);
}

.panel-tag {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #9dc5ff;
}

.panel-title {
  margin: 0;
  font-size: clamp(32px, 4vw, 50px);
  line-height: 1.06;
}

.panel-desc {
  margin: 16px 0 0;
  line-height: 1.8;
  color: rgba(235, 242, 255, 0.86);
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.panel-actions button {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  color: #f7fbff;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.panel-actions button:hover {
  transform: translateY(-1px);
}

.primary-btn {
  background: linear-gradient(135deg, #ff9a4a 0%, #ff4f7b 100%);
}

.panel-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 20px;
  font-size: 13px;
  color: rgba(209, 224, 255, 0.78);
}


</style>
