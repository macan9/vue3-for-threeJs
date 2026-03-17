import { postApi, getApi, delApi } from '@/common/requests/requests.js'
import { globals_config } from '/public/config/globals_config'

function getStoredGiteeConfig() {
	const configString = localStorage.getItem('giteeConfig')
	if (configString) {
		try {
			return JSON.parse(configString)
		} catch (error) {
			console.error(error)
		}
	}
	return globals_config.gitee_user_config
}

function getImageBedConfig() {
	const giteeConfig = getStoredGiteeConfig()
	return {
		owner: giteeConfig.owner,
		repo: giteeConfig.repo,
		branch: giteeConfig.branch || 'master',
		basePath: giteeConfig.basePath || giteeConfig.path || '',
		access_token: giteeConfig.access_token,
		message: giteeConfig.message || 'upload image',
	}
}

export const uploadUserAvatarReq = async (file, name) => {
	const { owner, repo, basePath, access_token, message, branch } = getImageBedConfig()
	const fullPath = [basePath, name].filter(Boolean).join('/')
	const data = { content: file, access_token, message, branch }
	return await postApi(`/gitee/api/v5/repos/${owner}/${repo}/contents/${fullPath}`, data)
}

export const getGiteeImgList = async () => {
	const { owner, repo, basePath, access_token } = getImageBedConfig()
	return await getApi(`/gitee/api/v5/repos/${owner}/${repo}/contents/${basePath}?access_token=${access_token}`)
}

export const delGiteeImg = async (sha, name) => {
	const { owner, repo, basePath, access_token, message } = getImageBedConfig()
	const data = { access_token, message, sha }
	const delStr = `?access_token=${access_token}&message=${message}&sha=${sha}`
	return await delApi(`/gitee/api/v5/repos/${owner}/${repo}/contents/${basePath}/${name}${delStr}`, data)
}

export const getGiteeContents = async (path = '') => {
	const normalizedPath = String(path || '').trim()
	const query = normalizedPath ? `?path=${encodeURIComponent(normalizedPath)}` : ''
	return await getApi(`/api/upload/gitee/contents${query}`)
}

export const deleteGiteeContent = async (path = '') => {
	const normalizedPath = String(path || '').trim()
	const query = normalizedPath ? `?path=${encodeURIComponent(normalizedPath)}` : ''
	return await delApi(`/api/upload/gitee/contents${query}`)
}

export const uploadGiteeFile = async (file, name, currentPath = '') => {
	const { owner, repo, basePath, access_token, message, branch } = getImageBedConfig()
	const fullPath = [basePath, currentPath, name]
		.filter(Boolean)
		.join('/')
		.replace(/\/{2,}/g, '/')
	const data = {
		content: file,
		access_token,
		message,
		branch,
	}
	return await postApi(`/gitee/api/v5/repos/${owner}/${repo}/contents/${fullPath}`, data)
}
