<template>
  <section
    class="fireworks-page home-view-page"
    @dblclick="handleBurst"
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

const rockets = []
const particles = []
const maxParticles = 600
const explosionColors = [12, 24, 36, 48, 195, 210, 280, 320]
const HORIZONTAL_SAFE_PADDING = 72
const BURST_TOP_RATIO = 0.18
const BURST_BOTTOM_RATIO = 0.58

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getSafeLaunchX(x = screenWidth / 2) {
  return clamp(x, HORIZONTAL_SAFE_PADDING, screenWidth - HORIZONTAL_SAFE_PADDING)
}

function getExplosionTargetY() {
  return randomBetween(screenHeight * BURST_TOP_RATIO, screenHeight * BURST_BOTTOM_RATIO)
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
      x: getSafeLaunchX(x),
      y: screenHeight + 20,
    })

    this.explosionColor = randomFrom(explosionColors)
    this.blastScale = randomBetween(0.72, 1.5)
    this.targetY = getExplosionTargetY()
  }

  explode() {
    const scale = this.blastScale
    const count = Math.round(randomBetween(48, 116) * scale)

    for (let i = 0; i < count; i += 1) {
      const particle = new Particle(this.pos)
      const angle = Math.random() * Math.PI * 2
      const speed = Math.cos(Math.random() * Math.PI / 2) * randomBetween(6, 15) * scale

      particle.vel.x = Math.cos(angle) * speed
      particle.vel.y = Math.sin(angle) * speed
      particle.size = randomBetween(4, 10) * Math.min(scale, 1.25)
      particle.gravity = randomBetween(0.16, 0.24)
      particle.resistance = randomBetween(0.9, 0.94)
      particle.shrink = randomBetween(0.92, 0.975)
      particle.fade = randomBetween(0.01, 0.024)
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

  const launchX = getSafeLaunchX(x)
  const edgeRatio = Math.abs(launchX - screenWidth / 2) / (screenWidth / 2)
  const rocket = new Rocket(launchX)
  rocket.vel.y = randomBetween(-10, -6.5)
  rocket.vel.x = randomBetween(-2.2, 2.2) * (1 - edgeRatio * 0.45)
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

  // Keep the background image visible while still leaving a trailing glow.
  context.fillStyle = 'rgba(4, 8, 18, 0.12)'
  context.fillRect(0, 0, screenWidth, screenHeight)
}

function updateRockets() {
  const aliveRockets = []

  rockets.forEach((rocket) => {
    rocket.update()
    rocket.pos.x = clamp(rocket.pos.x, HORIZONTAL_SAFE_PADDING * 0.72, screenWidth - HORIZONTAL_SAFE_PADDING * 0.72)
    rocket.render(context)

    const shouldExplode =
      rocket.pos.y <= rocket.targetY ||
      rocket.vel.y >= 0 ||
      rocket.pos.y < screenHeight * 0.12

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

  // Use a translucent night layer instead of an opaque fill, so the background image can remain visible.
  context.fillStyle = 'rgba(4, 8, 18, 0.12)'
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
</style>
