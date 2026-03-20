<template>
	<div class="home-view-page BlogMain">
		<div class="home-view-title">
			<div class="page-title">博客首页</div>
		</div>

		<div class="blog-main">
			<div class="blog-header">
				<div class="header-copy">
					<div class="header-title">最新文章</div>
					<!-- <div class="header-desc">先加载全部博客，再按列表形式展示封面、标题和简介。</div> -->
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
								@click="openBlogDetail(item, index)"
							>
								<div class="blog-cover-wrap">
									<img
										class="blog-cover"
										:src="item.coverUrl"
										:alt="item.title || '博客封面'"
									>
								</div>

								<div class="blog-content">
									<div class="blog-title-row">
										<h3 class="blog-title">{{ item.title || '未命名博客' }}</h3>
										<div class="blog-meta">
											<img
												v-if="item.isTop"
												class="blog-top-icon"
												:src="topStarIcon"
												alt="置顶"
											>
											<div class="blog-time">{{ formatDate(item.updated_at || item.created_at) }}</div>
										</div>
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
import { useRouter } from 'vue-router'
import { postListGet } from '@/apis/blogApis.js'
import topStarIcon from '@/assets/icon/top-star.svg'
import {
	formatDate,
	getCover,
	getRandomCover,
	getRowId,
	getSummary,
	thumbnailCoverList,
} from '@/views/blogSystem/blogHelpers.js'

const router = useRouter()
const blogList = ref([])
const loading = ref(false)

const preloadImage = (src) => {
	return new Promise((resolve) => {
		if (!src) {
			resolve()
			return
		}

		const image = new Image()
		image.onload = () => resolve()
		image.onerror = () => resolve()
		image.src = src
	})
}

const preloadCoverList = async (list) => {
	await Promise.all(list.map((item) => preloadImage(item.coverUrl)))
}

const openBlogDetail = (row, index) => {
	const id = getRowId(row, index)
	if (!id) {
		ElMessage.warning('未找到博客 id')
		return
	}
	router.push(`/blogDisplay/${id}`)
}

const getBlogList = async () => {
	loading.value = true
	try {
		const { data } = await postListGet()
		const list = Array.isArray(data?.data) ? data.data : []
		const nextList = list.map((item) => {
			const nextItem = {
				...item,
				fallbackCover: getRandomCover(thumbnailCoverList),
			}

			return {
				...nextItem,
				coverUrl: getCover(nextItem),
				isTop: Number(nextItem.is_top) === 1,
			}
		})
		await preloadCoverList(nextList)
		blogList.value = nextList
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
		margin-top: 5px;
		display: flex;
		align-items: stretch;
		gap: 20px;
		padding: 18px;
		border-radius: 22px;
		background: linear-gradient(135deg, #ffffff 0%, #f6faff 100%);
		border: 1px solid rgba(204, 220, 235, 0.95);
		box-shadow: 0 10px 24px rgba(108, 140, 170, 0.10);
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
	}

	.blog-card:hover {
		transform: translateY(-2px);
		border-color: rgba(143, 184, 224, 0.95);
		box-shadow: 0 16px 32px rgba(108, 140, 170, 0.16);
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

	.blog-meta {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: 8px;
		padding-top: 4px;
	}

	.blog-top-icon {
		width: 16px;
		height: 16px;
		display: block;
		flex: 0 0 auto;
	}

	.blog-time {
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
