<template>
	<div class="home-view-page blog-add-page">
		<div class="home-view-title">
			<div class="page-title">新增博客</div>
		</div>

		<div class="blog-add-main">
			<div class="editor-toolbar">
				<div class="toolbar-left">
					<el-button @click="goBack">返回</el-button>
					<el-input v-model="form.title" class="title-input" placeholder="请输入博客标题" />
				</div>

				<div class="toolbar-right">
					<el-radio-group v-model="editorMode" size="default">
						<el-radio-button label="source">源码</el-radio-button>
						<el-radio-button label="split">预览</el-radio-button>
						<el-radio-button label="preview">仅预览</el-radio-button>
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

			<div class="editor-shell" :class="`mode-${editorMode}`">
				<div v-if="editorMode !== 'preview'" class="editor-pane">
					<textarea
						ref="editorRef"
						v-model="form.content"
						class="editor-textarea"
						placeholder="# 开始写博客\n\n支持 Markdown，支持直接粘贴图片上传。"
						@paste="handleEditorPaste"
					></textarea>
				</div>

				<div v-if="editorMode !== 'source'" class="preview-pane">
					<div class="preview-shell">
						<div v-if="form.cover_image" class="preview-cover">
							<img :src="form.cover_image" alt="博客封面预览">
						</div>

						<div class="preview-head">
							<div class="preview-title-row">
								<h2 class="preview-title">{{ form.title || '未命名博客' }}</h2>
								<el-tag v-if="form.is_top" type="danger" size="small">置顶</el-tag>
							</div>
							<div v-if="currentTags.length" class="preview-tags">
								<el-tag v-for="item in currentTags" :key="item" size="small" effect="plain">
									{{ item }}
								</el-tag>
							</div>
							<div v-if="form.summary" class="preview-summary">{{ form.summary }}</div>
						</div>

						<div class="preview-content markdown-body" v-html="previewHtml"></div>
					</div>
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
import { computed, nextTick, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
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
import { renderMarkdown } from '@/utils/markdown.js'
import 'highlight.js/styles/atom-one-light.css'

const router = useRouter()
const editorRef = ref(null)
const editorMode = ref('split')
const settingsVisible = ref(false)
const settingsSubmitting = ref(false)
const submitting = ref(false)
const uploadingPasteImage = ref(false)

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

const currentTags = computed(() => normalizeBlogTags(form.tags))
const previewHtml = computed(() => {
	if (!form.content) {
		return '<p>暂无正文内容。</p>'
	}
	return renderMarkdown(form.content)
})

const goBack = () => {
	router.back()
}

const handleSettingsSubmit = (payload) => {
	form.title = payload.title
	form.summary = payload.summary
	form.cover_image = payload.cover_image
	form.tags = normalizeBlogTags(payload.tags)
	form.is_top = payload.is_top
	settingsVisible.value = false
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
		const ext = file.type.split('/')[1] || 'png'
		const fileName = `paste-${Date.now()}.${ext}`
		const base64Content = await fileToBase64(file)
		const response = await uploadGiteeFile(base64Content, fileName, 'blogImg')
		const imageUrl = resolveGiteeUploadedUrl(response, '')

		if (!imageUrl) {
			throw new Error('未获取到图片地址')
		}

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
		display: grid;
		gap: 14px;
	}

	.editor-shell.mode-source,
	.editor-shell.mode-preview {
		grid-template-columns: minmax(0, 1fr);
	}

	.editor-shell.mode-split {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	}

	.editor-pane,
	.preview-pane {
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

	.preview-shell {
		height: 100%;
		overflow: auto;
		padding: 24px;
	}

	.preview-cover {
		margin-bottom: 22px;
		height: 220px;
		border-radius: 18px;
		overflow: hidden;
		background: #eef3f8;
	}

	.preview-cover img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}

	.preview-head {
		padding-bottom: 16px;
		border-bottom: 1px solid rgba(213, 225, 235, 0.95);
	}

	.preview-title-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.preview-title {
		margin: 0;
		font-size: 30px;
		line-height: 1.2;
		font-weight: 800;
		color: #213346;
		word-break: break-word;
	}

	.preview-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 14px;
	}

	.preview-summary {
		margin-top: 16px;
		padding: 14px 16px;
		border-radius: 16px;
		background: rgba(242, 247, 252, 0.95);
		color: #5d7083;
		font-size: 14px;
		line-height: 1.8;
	}

	.preview-content {
		margin-top: 24px;
		color: #33475b;
		font-size: 16px;
		line-height: 1.9;
	}

	.preview-shell::-webkit-scrollbar {
		width: 6px;
	}

	.preview-shell::-webkit-scrollbar-thumb {
		border-radius: 999px;
		background: rgba(126, 146, 166, 0.5);
	}

	.preview-shell {
		scrollbar-width: thin;
		scrollbar-color: rgba(126, 146, 166, 0.55) transparent;
	}

	.markdown-body h1,
	.markdown-body h2,
	.markdown-body h3,
	.markdown-body h4,
	.markdown-body h5,
	.markdown-body h6 {
		margin: 1.6em 0 0.7em;
		line-height: 1.35;
		color: #1f3144;
	}

	.markdown-body p,
	.markdown-body ul,
	.markdown-body ol,
	.markdown-body blockquote {
		margin: 1em 0;
	}

	.markdown-body a {
		color: #2f7ddc;
		text-decoration: none;
	}

	.markdown-body a:hover {
		text-decoration: underline;
	}

	.markdown-body img {
		max-width: 100%;
		border-radius: 16px;
	}

	.markdown-body pre {
		margin: 1.4em 0;
		padding: 18px 20px;
		border-radius: 18px;
		overflow: auto;
		background: #f6f8fb;
		border: 1px solid rgba(219, 229, 238, 0.95);
	}

	.markdown-body code {
		font-family: Consolas, Monaco, monospace;
		font-size: 0.92em;
	}

	.markdown-body :not(pre) > code {
		padding: 0.18em 0.45em;
		border-radius: 8px;
		background: rgba(228, 236, 245, 0.95);
		color: #28435f;
	}

	.markdown-body blockquote {
		padding: 8px 0 8px 16px;
		border-left: 4px solid #9bc3ef;
		color: #607387;
		background: rgba(245, 249, 253, 0.9);
		border-radius: 0 12px 12px 0;
	}

	.markdown-body table {
		width: 100%;
		border-collapse: collapse;
		margin: 1.4em 0;
		overflow: hidden;
		border-radius: 14px;
	}

	.markdown-body th,
	.markdown-body td {
		padding: 12px 14px;
		border: 1px solid rgba(219, 229, 238, 0.95);
		text-align: left;
	}

	.markdown-body th {
		background: #f6f9fc;
		color: #23384d;
	}

	@media (max-width: 980px) {
		.editor-shell.mode-split {
			grid-template-columns: minmax(0, 1fr);
		}

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
	}
}
</style>
