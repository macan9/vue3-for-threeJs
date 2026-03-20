<template>
  <div class="resume-page">
    <div class="resume-shell">
      <header class="resume-toolbar">
        <div>
          <p class="resume-eyebrow">Resume Rebuilt</p>
          <h1>个人简历</h1>
          <p class="resume-file">{{ resumeFileName }}</p>
        </div>

        <div class="resume-actions">
          <el-button plain @click="routeBack">我的博客</el-button>
          <el-button type="primary" tag="a" :href="resumeUrl" :download="resumeFileName">
            下载 DOCX
          </el-button>
        </div>
      </header>

      <div class="resume-stage">
        <section v-if="!isLoading && !errorMessage" class="resume-card">
          <div class="resume-content prose-reset" v-html="htmlContent"></div>
        </section>

        <div v-if="isLoading" class="resume-state resume-stage-mask">
          <div class="resume-spinner"></div>
          <p>正在提取 DOCX 内容并重排页面...</p>
        </div>

        <div v-else-if="errorMessage" class="resume-state resume-stage-mask is-error">
          <p>{{ errorMessage }}</p>
          <el-button type="primary" @click="loadResume">重新加载</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import mammoth from 'mammoth/mammoth.browser'

const router = useRouter()
const isLoading = ref(true)
const errorMessage = ref('')
const htmlContent = ref('')

const resumeFileName = '简历（马灿）4.0.docx'
const resumeUrl = `${process.env.BASE_URL}resume/${encodeURIComponent(resumeFileName)}`

const routeBack = () => {
  router.push({ name: 'BlogMain' })
}

const normalizeText = (text) => {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[：:]\s+/g, '：')
    .trim()
}

const classifyParagraph = (text) => {
  if (!text) return 'body'
  if (['个人信息', '教育经历', '工作经历', '个人技能', '项目经历'].includes(text)) return 'section-title'
  if (['Personal Information', 'Education Background', 'Work Experience', 'Personal Skills', 'Project Experience'].includes(text)) {
    return 'section-subtitle'
  }
  if (/^马\s*灿$/.test(text)) return 'hero-name'
  if (/^求职目标/.test(text)) return 'hero-goal'
  if (/^(MOBILE|E-MAIL|Address|求职目标)/.test(text)) return 'hero-meta'
  if (/^\d{4}\.\d{1,2}\s*(至|-)/.test(text) || /有限公司$/.test(text) || /平台（.*系统）$/.test(text) || /项目$/.test(text)) {
    return 'entry-title'
  }
  return 'body'
}

const postProcessHtml = (rawHtml) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div class="resume-root">${rawHtml}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return rawHtml

  const nodes = Array.from(root.querySelectorAll('p, h1, h2, h3, h4, h5, li'))

  nodes.forEach((node) => {
    const text = normalizeText(node.textContent)
    if (!text) {
      node.remove()
      return
    }
    node.classList.add(`resume-${classifyParagraph(text)}`)
  })

  const images = Array.from(root.querySelectorAll('img'))
  images.forEach((image, index) => {
    image.classList.add('resume-image')
    if (index === 0) image.classList.add('resume-photo')
    else image.classList.add('resume-illustration')
  })

  const heroTable = root.querySelector('table')
  if (heroTable) {
    const heroNameNode = heroTable.querySelector('.resume-hero-name')
    const heroGoalNode = heroTable.querySelector('.resume-hero-goal')
    const heroPhotoNode = heroTable.querySelector('.resume-photo')

    if (heroNameNode && heroGoalNode && heroPhotoNode) {
      const heroRow = heroTable.querySelector('tr')
      const heroCells = heroRow ? Array.from(heroRow.children) : []

      if (heroCells.length >= 2) {
        const leftCell = heroCells[0]
        const rightCell = heroCells[heroCells.length - 1]
        const heroLayout = doc.createElement('section')
        heroLayout.className = 'resume-hero-layout'

        const heroMain = doc.createElement('div')
        heroMain.className = 'resume-hero-main'
        Array.from(leftCell.childNodes).forEach((child) => {
          heroMain.appendChild(child)
        })

        const heroAside = doc.createElement('div')
        heroAside.className = 'resume-hero-aside'
        Array.from(rightCell.childNodes).forEach((child) => {
          heroAside.appendChild(child)
        })

        heroLayout.appendChild(heroMain)
        heroLayout.appendChild(heroAside)
        heroTable.replaceWith(heroLayout)
      }
    }
  }

  const nestedBodyItems = Array.from(root.querySelectorAll('li.resume-body'))
  nestedBodyItems.forEach((item) => {
    const elementChildren = Array.from(item.children).filter((child) => child.nodeType === Node.ELEMENT_NODE)
    const hasSingleNestedList =
      elementChildren.length === 1 && ['UL', 'OL'].includes(elementChildren[0].tagName)
    const text = normalizeText(item.textContent)

    if (hasSingleNestedList && text) {
      item.classList.remove('resume-body')
      item.classList.add('resume-list-wrapper')
    }
  })

  const paragraphs = Array.from(root.children).filter((node) => node.tagName === 'P')
  paragraphs.forEach((node) => {
    const text = normalizeText(node.textContent)
    if (!text) return
    if (classifyParagraph(text) === 'section-title') {
      const hr = doc.createElement('div')
      hr.className = 'resume-divider'
      node.before(hr)
    }
  })

  return root.innerHTML
}

const loadResume = async () => {
  isLoading.value = true
  errorMessage.value = ''
  htmlContent.value = ''

  try {
    const response = await fetch(resumeUrl)
    if (!response.ok) {
      throw new Error(`DOCX 文件加载失败，HTTP ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const { value, messages } = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: mammoth.images.inline(async (element) => {
          return {
            src: await element.read('base64').then((imageBuffer) => `data:${element.contentType};base64,${imageBuffer}`),
          }
        }),
      }
    )

    if (messages?.length) {
      console.warn('mammoth messages', messages)
    }

    htmlContent.value = postProcessHtml(value)
  } catch (error) {
    errorMessage.value = error?.message || 'DOCX 内容提取失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadResume()
})
</script>

<style lang="scss">
.resume-page {
  min-height: 100%;
  padding: 20px;
  background:
    radial-gradient(circle at 12% 12%, rgba(125, 211, 252, 0.32), transparent 24%),
    radial-gradient(circle at 88% 10%, rgba(96, 165, 250, 0.18), transparent 22%),
    radial-gradient(circle at 50% 100%, rgba(186, 230, 253, 0.3), transparent 28%),
    linear-gradient(180deg, #f3fbff 0%, #eef6ff 44%, #f8fbff 100%);
  box-sizing: border-box;
}

.resume-shell {
  min-height: calc(100vh - 110px);
  padding: 24px;
  border: 1px solid rgba(125, 211, 252, 0.24);
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(248, 252, 255, 0.8));
  box-shadow: 0 28px 70px rgba(14, 116, 144, 0.1);
  backdrop-filter: blur(16px);
  box-sizing: border-box;
}

.resume-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.resume-toolbar h1 {
  margin: 6px 0 8px;
  font-size: 32px;
  line-height: 1.1;
  color: #0f172a;
}

.resume-eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #2563eb;
}

.resume-file {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.resume-actions {
  display: flex;
  gap: 12px;
}

.resume-stage {
  position: relative;
  min-height: calc(100vh - 230px);
  padding: 18px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(224, 242, 254, 0.62), rgba(239, 246, 255, 0.92));
  border: 1px solid rgba(125, 211, 252, 0.18);
  overflow: auto;
}

.resume-card {
  max-width: 920px;
  margin: 0 auto;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(125, 211, 252, 0.18), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #f8fcff 100%);
  border: 1px solid rgba(186, 230, 253, 0.75);
  box-shadow: 0 28px 60px rgba(14, 116, 144, 0.12);
  overflow: hidden;
}

.resume-content {
  padding: 42px 46px 52px;
  color: #1f2937;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 252, 255, 0.98));
}

.resume-content > table {
  width: 100%;
}

.prose-reset * {
  box-sizing: border-box;
}

.prose-reset p,
.prose-reset li {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.85;
  color: #425466;
}

.prose-reset .resume-hero-name {
  margin: 0 0 10px;
  font-size: 42px;
  line-height: 1;
  color: #163a63;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.prose-reset .resume-hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 28px;
  align-items: start;
  width: 100%;
  max-width: 100%;
  margin-bottom: 10px;
}

.prose-reset .resume-hero-main {
  min-width: 0;
  width: 100%;
}

.prose-reset .resume-hero-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-self: end;
  width: 280px;
  max-width: 100%;
}

.prose-reset .resume-hero-meta {
  color: #5f7388;
  font-size: 14px;
  line-height: 1.75;
}

.prose-reset .resume-hero-goal {
  margin: -6px 0 18px;
  width: 100%;
  max-width: 280px;
  padding: 10px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(224, 242, 254, 0.92), rgba(240, 249, 255, 0.7));
  box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.35);
  color: #0f3b57;
  font-size: 18px;
  line-height: 1.7;
  font-weight: 700;
  text-align: left;
}

.prose-reset .resume-section-title {
  display: inline-flex;
  align-items: center;
  margin: 18px 0 8px;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 25px;
  line-height: 1.25;
  color: #38bdf8;
  font-weight: 800;
  letter-spacing: 0.03em;
  background: linear-gradient(90deg, rgba(224, 242, 254, 0.95), rgba(240, 249, 255, 0.72));
  box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.36);
}

.prose-reset .resume-section-subtitle {
  margin: 6px 0 20px;
  font-size: 15px;
  line-height: 1.55;
  color: #7dd3fc;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.prose-reset .resume-entry-title {
  margin: 18px 0 10px;
  font-size: 17px;
  line-height: 1.6;
  color: #1e3a5f;
  font-weight: 700;
}

.prose-reset .resume-divider {
  width: 100%;
  height: 2px;
  margin: 34px 0 20px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.7), rgba(186, 230, 253, 0.12));
}

.prose-reset ul,
.prose-reset ol {
  margin: 0 0 14px;
  padding-left: 20px;
}

.prose-reset ul li,
.prose-reset ol li {
  margin-bottom: 8px;
}

.prose-reset li.resume-list-wrapper {
  list-style: none;
  margin-bottom: 0;
}

.prose-reset li.resume-list-wrapper::marker {
  content: '';
}

.prose-reset li.resume-list-wrapper > ul,
.prose-reset li.resume-list-wrapper > ol {
  margin-top: 0;
  margin-bottom: 0;
  padding-left: 0;
}

.prose-reset ul ul,
.prose-reset ol ol,
.prose-reset ul ol,
.prose-reset ol ul {
  margin: 8px 0 4px;
  padding-left: 24px;
}

.prose-reset ul ul li,
.prose-reset ol ol li,
.prose-reset ul ol li,
.prose-reset ol ul li {
  margin-bottom: 10px;
  color: #334e68;
  line-height: 1.9;
  list-style-type: disc;
}

.prose-reset p + ul,
.prose-reset p + ol {
  margin-top: 6px;
}

.prose-reset .resume-entry-title + ul,
.prose-reset .resume-entry-title + ol {
  margin-top: 10px;
}

.prose-reset .resume-image {
  display: block;
  border-radius: 18px;
}

.prose-reset .resume-photo {
  width: 140px;
  height: auto;
  margin: 4px 0 18px auto;
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.12);
}

.prose-reset .resume-illustration {
  width: 100%;
  margin: 0 0 22px;
  opacity: 0.16;
}

.resume-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #334155;
}

.resume-state.is-error {
  color: #b91c1c;
}

.resume-stage-mask {
  position: absolute;
  inset: 18px;
  border-radius: 18px;
  background: rgba(247, 252, 255, 0.94);
}

.resume-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(37, 99, 235, 0.14);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: resume-spin 0.9s linear infinite;
}

@media (max-width: 768px) {
  .resume-page {
    padding: 12px;
  }

  .resume-shell {
    min-height: calc(100vh - 84px);
    padding: 16px;
    border-radius: 20px;
  }

  .resume-toolbar {
    flex-direction: column;
  }

  .resume-toolbar h1 {
    font-size: 26px;
  }

  .resume-actions {
    width: 100%;
  }

  .resume-actions .el-button,
  .resume-actions a.el-button {
    flex: 1;
  }

  .resume-stage {
    padding: 10px;
    border-radius: 16px;
  }

  .resume-stage-mask {
    inset: 10px;
    border-radius: 12px;
  }

  .resume-content {
    padding: 24px 18px 32px;
  }

  .prose-reset .resume-section-title {
    margin: 16px 0 8px;
    padding: 6px 12px;
    font-size: 21px;
  }

  .prose-reset .resume-section-subtitle {
    margin: 4px 0 16px;
    font-size: 13px;
    letter-spacing: 0.12em;
  }

  .prose-reset .resume-hero-name {
    font-size: 32px;
  }

  .prose-reset .resume-hero-layout {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .prose-reset .resume-hero-aside {
    align-items: flex-start;
  }

  .prose-reset .resume-hero-goal {
    margin: 0 0 18px;
    max-width: none;
    font-size: 16px;
  }

  .prose-reset .resume-photo {
    width: 112px;
    margin: 0 0 16px;
  }
}

@keyframes resume-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
