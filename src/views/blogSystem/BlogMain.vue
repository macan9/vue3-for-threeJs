<template>
	<div class="home-view-page BlogMain">
		<div class="home-view-title">
			<div class="page-title">博客首页</div>
		</div>

		<div class="blog-main">
			<div class="blog-header">
				<div class="header-copy">
					<div class="header-title">最新文章</div>
					<div class="header-desc">先加载全部博客，再按列表形式展示封面、标题和简介。</div>
				</div>
				<el-button type="primary" plain :loading="loading" @click="getBlogList">刷新</el-button>
			</div>

			<div class="blog-list-wrap">
				<el-skeleton :loading="loading" animated :count="4">
					<template #template>
						<div class="blog-card skeleton-card">
							<div class="blog-cover skeleton-block"></div>
							<div class="blog-content">
								<div class="skeleton-title skeleton-block"></div>
								<div class="skeleton-summary skeleton-block"></div>
								<div class="skeleton-summary short skeleton-block"></div>
							</div>
						</div>
					</template>

					<template #default>
						<el-empty v-if="!blogList.length" description="暂无博客内容" />

						<div v-else class="blog-list">
							<article
								v-for="(item, index) in blogList"
								:key="getRowId(item, index)"
								class="blog-card"
							>
								<div class="blog-cover-wrap">
									<img
										v-if="getCover(item)"
										class="blog-cover"
										:src="getCover(item)"
										:alt="item.title || '博客封面'"
									>
									<div v-else class="blog-cover blog-cover-placeholder">
										<span>{{ getTitleInitial(item) }}</span>
									</div>
								</div>

								<div class="blog-content">
									<div class="blog-title-row">
										<h3 class="blog-title">{{ item.title || '未命名博客' }}</h3>
										<div class="blog-time">{{ formatTime(item.updated_at || item.created_at) }}</div>
									</div>

									<p class="blog-summary">
										{{ getSummary(item) }}
									</p>
								</div>
							</article>
						</div>
					</template>
				</el-skeleton>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { postListGet } from '@/apis/blogApis.js'

const blogList = ref([])
const loading = ref(false)
const localCoverList = Array.from({ length: 10 }, (_, index) => `/img/blogThumbnails/cover-${String(index + 1).padStart(2, '0')}.svg`)

const coverFieldList = [
	'cover',
	'coverUrl',
	'cover_url',
	'image',
	'imageUrl',
	'image_url',
	'img',
	'imgUrl',
	'img_url',
	'thumbnail',
	'thumb',
	'banner',
]

const summaryFieldList = [
	'summary',
	'desc',
	'description',
	'introduction',
	'intro',
	'content',
	'markdown',
	'md',
]

const getRowId = (row, index) => row?.id ?? row?._id ?? row?.postId ?? row?.post_id ?? `${row?.title || 'blog'}-${index}`

const pickField = (row, fieldList) => {
	for (const field of fieldList) {
		const value = row?.[field]
		if (typeof value === 'string' && value.trim()) {
			return value.trim()
		}
	}
	return ''
}

const stripMarkdown = (value = '') => {
	return String(value)
		.replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
		.replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
		.replace(/[`>#*_~-]/g, ' ')
		.replace(/\n+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

const getRandomLocalCover = () => {
	const randomIndex = Math.floor(Math.random() * localCoverList.length)
	return localCoverList[randomIndex]
}

const getCover = (row) => pickField(row, coverFieldList) || row?.fallbackCover || ''

const getSummary = (row) => {
	const rawText = pickField(row, summaryFieldList)
	const text = stripMarkdown(rawText)
	if (!text) return '这篇博客暂时还没有简介内容。'
	return text.length > 120 ? `${text.slice(0, 120)}...` : text
}

const getTitleInitial = (row) => {
	const title = row?.title?.trim?.()
	return title ? title.slice(0, 1).toUpperCase() : 'B'
}

const formatTime = (val) => {
	if (!val) return ''
	const d = new Date(val)
	if (Number.isNaN(d.getTime())) return String(val)
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd}`
}

const getBlogList = async () => {
	loading.value = true
	try {
		const { data } = await postListGet()
		const list = Array.isArray(data?.data) ? data.data : []
		blogList.value = list.map((item) => ({
			...item,
			fallbackCover: getRandomLocalCover(),
		}))
	} catch (error) {
		console.error('获取博客列表失败', error)
		ElMessage.error('获取博客列表失败')
		blogList.value = []
	} finally {
		loading.value = false
	}
}

getBlogList()
</script>

<style lang="scss">
.BlogMain {
	height: 100%;
	display: flex;
	flex-direction: column;

	.blog-main {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 18px 20px 20px;
		gap: 18px;
	}

	.blog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 2px 4px 0;
	}

	.header-copy {
		min-width: 0;
	}

	.header-title {
		font-size: 22px;
		font-weight: 700;
		color: #243447;
	}

	.header-desc {
		margin-top: 6px;
		font-size: 14px;
		color: #718399;
	}

	.blog-list-wrap {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding-right: 4px;
	}

	.blog-list {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.blog-card {
		display: flex;
		align-items: stretch;
		gap: 20px;
		padding: 18px;
		border-radius: 22px;
		background: linear-gradient(135deg, #ffffff 0%, #f6faff 100%);
		border: 1px solid rgba(204, 220, 235, 0.95);
		box-shadow: 0 10px 24px rgba(108, 140, 170, 0.10);
	}

	.blog-cover-wrap {
		flex: 0 0 220px;
	}

	.blog-cover {
		width: 220px;
		height: 136px;
		display: block;
		border-radius: 18px;
		object-fit: cover;
		background: #dbe7f2;
	}

	.blog-cover-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background:
			linear-gradient(135deg, rgba(91, 163, 255, 0.95), rgba(129, 207, 255, 0.82)),
			linear-gradient(180deg, #d7e6f8, #eef5fb);
		color: #fff;
		font-size: 42px;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.blog-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 14px;
	}

	.blog-title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.blog-title {
		margin: 0;
		font-size: 24px;
		line-height: 1.35;
		font-weight: 700;
		color: #203040;
		word-break: break-word;
	}

	.blog-time {
		flex: 0 0 auto;
		padding-top: 4px;
		font-size: 13px;
		color: #8a99aa;
		white-space: nowrap;
	}

	.blog-summary {
		margin: 0;
		font-size: 15px;
		line-height: 1.9;
		color: #526477;
		word-break: break-word;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.skeleton-card {
		margin-bottom: 18px;
	}

	.skeleton-block {
		background: linear-gradient(90deg, #eef4fa 25%, #e5edf6 37%, #eef4fa 63%);
		background-size: 400% 100%;
		border-radius: 16px;
	}

	.skeleton-title {
		height: 30px;
		width: 55%;
	}

	.skeleton-summary {
		height: 20px;
		width: 100%;
	}

	.skeleton-summary.short {
		width: 78%;
	}

	:deep(.el-skeleton) {
		display: block;
	}

	:deep(.el-empty) {
		height: 100%;
		min-height: 360px;
	}

	@media (max-width: 900px) {
		.blog-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.blog-card {
			flex-direction: column;
		}

		.blog-cover-wrap,
		.blog-cover {
			width: 100%;
		}

		.blog-cover-wrap {
			flex-basis: auto;
		}

		.blog-title-row {
			flex-direction: column;
			gap: 8px;
		}

		.blog-title {
			font-size: 20px;
		}
	}
}
</style>
