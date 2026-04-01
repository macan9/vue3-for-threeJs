import axios from 'axios'
import { ElMessage } from 'element-plus'

import { globals_config } from '/public/config/globals_config'
import { loginOut } from '@/common/plugins/user_manage_methods'

const api = axios.create({
	baseURL: globals_config.api_service || globals_config.host_service,
	timeout: 4000,
	withCredentials: true,
})

api.interceptors.request.use(
	(config) => {
		const isGiteeUrl = config.url.startsWith('/gitee')
		if (isGiteeUrl) {
			config.baseURL = 'https://gitee.com'
			config.url = config.url.replace('/gitee', '')
			config.withCredentials = false
		} else {
			const userInfoString = localStorage.getItem('userInfo')
			if (userInfoString) {
				const userInfo = JSON.parse(userInfoString)
				const token = userInfo.token
				config.headers.Authorization = `JWT ${token}`
			}
			config.headers['Accept-Language'] = 'zh-hans'
		}

		return config
	},
	(err) => Promise.reject(err),
)

api.interceptors.response.use(
	(res) => res,
	(err) => {
		console.log(err, 'interceptors.response.err')
		const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || '请求失败'

		ElMessage({
			message: String(msg),
			type: 'error',
		})

		const loginStatus = String(localStorage.getItem('loginStatus') || '').trim()
		if (err.response && err.response.status === 401 && loginStatus) {
			loginOut()
		}

		return Promise.reject(err)
	},
)

export default api
