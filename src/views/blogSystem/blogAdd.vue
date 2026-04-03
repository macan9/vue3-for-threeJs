<template>
	<div class="home-view-page blog-add-page">
		<div class="home-view-title">
			<div class="page-title">新增博客</div>
		</div>

		<div class="blog-add-main">
			<div class="editor-toolbar">
				<div class="toolbar-left">
					<el-button v-if="showBackButton" @click="goBack">返回</el-button>
					<el-input v-model="form.title" class="title-input" placeholder="请输入博客标题" />
				</div>

				<div class="toolbar-right">
					<el-radio-group v-model="editorMode" size="default">
						<el-radio-button label="source">源码编辑</el-radio-button>
						<el-radio-button label="wysiwyg">正常编辑</el-radio-button>
					</el-radio-group>
					<el-button circle @click="settingsVisible = true">
						<el-icon><Setting /></el-icon>
					</el-button>
					<el-button type="primary" :loading="submitting" @click="handleSubmit">发布</el-button>
				</div>
			</div>

			<div class="editor-meta">
				<el-tag v-if="form.is_top" type="danger" effect="light">置顶</el-tag>
				<el-tag v-for="item in currentTags" :key="item" effect="plain">{{ item }}</el-tag>
				<span v-if="uploadingPasteImage" class="upload-status">图片上传中...</span>
			</div>

			<div class="editor-shell">
				<div v-show="editorMode === 'source'" class="editor-pane">
					<textarea
						ref="editorRef"
						v-model="form.content"
						class="editor-textarea"
						placeholder="# 开始写博客\n\n支持 Markdown，支持直接粘贴图片上传。"
						@paste="handleEditorPaste"
					></textarea>
				</div>

				<div v-show="editorMode === 'wysiwyg'" class="editor-pane visual-editor-pane">
					<div ref="vditorRef" class="vditor-shell"></div>
				</div>
			</div>
		</div>

		<BlogEditorDialog
			v-model:visible="settingsVisible"
			title="博客设置"
			:form="form"
			:rules="settingsRules"
			:submitting="settingsSubmitting"
			@submit="handleSettingsSubmit"
		/>
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import Vditor from 'vditor'
import { postCreateReq } from '@/apis/blogApis.js'
import { uploadGiteeFile } from '@/apis/giteeApis.js'
import { isApiSuccess } from '@/common/requests/requests.js'
import BlogEditorDialog from '@/views/blogSystem/components/BlogEditorDialog.vue'
import {
	buildBlogSubmitPayload,
	fileToBase64,
	normalizeBlogTags,
	resolveGiteeUploadedUrl,
} from '@/views/blogSystem/blogHelpers.js'
import { normalizeMarkdownContent } from '@/utils/markdown.js'
import 'highlight.js/styles/atom-one-light.css'
import 'vditor/dist/index.css'

const router = useRouter()
const route = useRoute()
const editorRef = ref(null)
const vditorRef = ref(null)
const vditorInstance = ref(null)
const editorMode = ref('wysiwyg')
const settingsVisible = ref(false)
const settingsSubmitting = ref(false)
const submitting = ref(false)
const uploadingPasteImage = ref(false)
const syncingFromVditor = ref(false)

const form = reactive({
	title: '',
	summary: '',
	content: '',
	cover_image: '',
	tags: [],
	is_top: false,
})

const settingsRules = {
	title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
}

const showBackButton = computed(() => route.query?.from === 'blogManage')
const currentTags = computed(() => normalizeBlogTags(form.tags))

const goBack = () => {
	if (window.history.length > 1) {
		router.back()
		return
	}

	router.push('/blogManage')
}

const handleSettingsSubmit = (payload) => {
	form.title = payload.title
	form.summary = payload.summary
	form.cover_image = payload.cover_image
	form.tags = normalizeBlogTags(payload.tags)
	form.is_top = payload.is_top
	settingsVisible.value = false
}

const syncContentFromVditor = () => {
	if (!vditorInstance.value) return

	syncingFromVditor.value = true
	form.content = vditorInstance.value.getValue()
	nextTick(() => {
		syncingFromVditor.value = false
	})
}

const uploadEditorImage = async (file) => {
	const isLt10M = file.size / 1024 / 1024 < 10
	if (!isLt10M) {
		ElMessage.warning('图片大小不能超过 10MB')
		throw new Error('图片大小不能超过 10MB')
	}

	const ext = file.type.split('/')[1] || 'png'
	const fileName = `paste-${Date.now()}.${ext}`
	const base64Content = await fileToBase64(file)
	const response = await uploadGiteeFile(base64Content, fileName, 'blogImg')
	const imageUrl = resolveGiteeUploadedUrl(response, '')

	if (!imageUrl) {
		throw new Error('未获取到图片地址')
	}

	return imageUrl
}

const initVditor = async () => {
	if (vditorInstance.value || !vditorRef.value) return

	vditorInstance.value = new Vditor(vditorRef.value, {
		height: '100%',
		mode: 'wysiwyg',
		lang: 'zh_CN',
		cache: {
			enable: false,
		},
		counter: {
			enable: true,
			type: 'markdown',
		},
		outline: {
			enable: true,
			position: 'left',
		},
		toolbarConfig: {
			pin: true,
		},
		toolbar: [
			'emoji',
			'headings',
			'bold',
			'italic',
			'strike',
			'link',
			'|',
			'list',
			'ordered-list',
			'check',
			'quote',
			'line',
			'code',
			'inline-code',
			'table',
			'upload',
			'|',
			'undo',
			'redo',
			'outline',
		],
		upload: {
			accept: 'image/*',
			max: 10 * 1024 * 1024,
			multiple: false,
			handler: async (files) => {
				const rawFile = files?.[0]
				if (!rawFile) return

				uploadingPasteImage.value = true
				try {
					const imageUrl = await uploadEditorImage(rawFile)
					vditorInstance.value?.insertValue(`![image](${imageUrl})`)
					syncContentFromVditor()
					ElMessage.success('图片上传成功')
				} catch (error) {
					console.error('可视化编辑器图片上传失败', error)
					ElMessage.error(String(error?.message || '图片上传失败'))
				} finally {
					uploadingPasteImage.value = false
				}
			},
		},
		after: () => {
			vditorInstance.value?.setValue(normalizeMarkdownContent(form.content || ''))
		},
		input: () => {
			syncContentFromVditor()
		},
		blur: () => {
			syncContentFromVditor()
		},
	})
}

const insertTextAtCursor = async (text) => {
	const textarea = editorRef.value
	if (!textarea) {
		form.content += text
		return
	}

	const start = textarea.selectionStart ?? form.content.length
	const end = textarea.selectionEnd ?? form.content.length
	form.content = `${form.content.slice(0, start)}${text}${form.content.slice(end)}`

	await nextTick()
	const position = start + text.length
	textarea.focus()
	textarea.setSelectionRange(position, position)
}

const handleEditorPaste = async (event) => {
	const items = Array.from(event.clipboardData?.items || [])
	const imageItem = items.find((item) => String(item.type || '').startsWith('image/'))
	if (!imageItem) return

	event.preventDefault()
	const file = imageItem.getAsFile()
	if (!file) return

	const isLt10M = file.size / 1024 / 1024 < 10
	if (!isLt10M) {
		ElMessage.warning('图片大小不能超过 10MB')
		return
	}

	uploadingPasteImage.value = true
	try {
		const imageUrl = await uploadEditorImage(file)
		const markdownImage = `\n![image](${imageUrl})\n`
		await insertTextAtCursor(markdownImage)
		ElMessage.success('图片上传成功')
	} catch (error) {
		console.error('粘贴图片上传失败', error)
		ElMessage.error('粘贴图片上传失败')
	} finally {
		uploadingPasteImage.value = false
	}
}

const handleSubmit = async () => {
	if (submitting.value) return
	const payload = buildBlogSubmitPayload(form)

	if (!payload.title) {
		ElMessage.warning('请输入标题')
		return
	}

	if (!payload.content.trim()) {
		ElMessage.warning('请输入正文内容')
		return
	}

	submitting.value = true
	try {
		const response = await postCreateReq(payload)
		if (!isApiSuccess(response)) {
			ElMessage.error(String(response?.message || '发布失败'))
			return
		}

		ElMessage.success('发布成功')
		router.push('/blogManage')
	} catch (error) {
		console.error('发布失败', error)
		ElMessage.error(String(error?.message || '发布失败'))
	} finally {
		submitting.value = false
	}
}

watch(
	() => editorMode.value,
	async (mode) => {
		if (mode !== 'wysiwyg') {
			syncContentFromVditor()
			return
		}

		await nextTick()
		await initVditor()
		vditorInstance.value?.setValue(normalizeMarkdownContent(form.content || ''))
	}
)

watch(
	() => form.content,
	(value) => {
		if (editorMode.value !== 'wysiwyg' || !vditorInstance.value || syncingFromVditor.value) return

		const nextValue = normalizeMarkdownContent(value || '')
		if (nextValue === vditorInstance.value.getValue()) return
		vditorInstance.value.setValue(nextValue)
	}
)

onMounted(async () => {
	if (editorMode.value !== 'wysiwyg') return

	await nextTick()
	await initVditor()
})

onBeforeUnmount(() => {
	vditorInstance.value?.destroy()
	vditorInstance.value = null
})
</script>

<style lang="scss">
.blog-add-page {
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 10px;

	.blog-add-main {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 15px;
	}

	.editor-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.toolbar-left,
	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.title-input {
		width: min(520px, calc(100vw - 180px));
	}

	.editor-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		min-height: 32px;
	}

	.upload-status {
		font-size: 13px;
		color: #6b7f94;
	}

	.editor-shell {
		flex: 1;
		min-height: 0;
		display: flex;
	}

	.editor-pane {
		flex: 1;
		min-height: 0;
		border-radius: 22px;
		border: 1px solid rgba(221, 230, 239, 0.95);
		background: rgba(255, 255, 255, 0.96);
		overflow: hidden;
	}

	.editor-textarea {
		width: 100%;
		height: 100%;
		min-height: 520px;
		border: 0;
		outline: none;
		resize: none;
		padding: 24px;
		font-size: 15px;
		line-height: 1.9;
		color: #24384c;
		background: transparent;
		font-family: Consolas, Monaco, 'Courier New', monospace;
	}

	.visual-editor-pane {
		padding: 0;
	}

	.vditor-shell {
		height: 100%;
	}

	:deep(.vditor) {
		height: 100%;
		border: 0;
		border-radius: 22px;
	}

	:deep(.vditor-toolbar) {
		border-bottom: 1px solid rgba(221, 230, 239, 0.95);
		background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(244, 248, 253, 0.95));
	}

	:deep(.vditor-content) {
		height: calc(100% - 52px);
	}

	:deep(.vditor-wysiwyg) {
		padding: 24px 28px;
		font-size: 15px;
		line-height: 1.9;
		color: #24384c;
	}

	:deep(.vditor-outline) {
		border-right: 1px solid rgba(221, 230, 239, 0.95);
		background: rgba(248, 251, 255, 0.78);
	}

	:deep(.vditor-outline__title) {
		font-weight: 700;
		color: #27425d;
	}

	:deep(.vditor-outline__content) {
		font-size: 13px;
	}

	@media (max-width: 980px) {
		.title-input {
			width: 100%;
		}

		.toolbar-left,
		.toolbar-right {
			width: 100%;
		}

		.toolbar-right {
			justify-content: flex-end;
		}

		:deep(.vditor-outline) {
			display: none;
		}
	}
}
</style>
