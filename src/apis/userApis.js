import { postApi, getApi, delApi, putApi } from '@/common/requests/requests.js'

// 用户登录
export const loginReq = async (data) => {
	return await postApi('/api/users/login', data)
}

// 图形验证码获取
export const getCaptcha = async () => {
	return await getApi('/api/captcha/json')
}

// 用户注册
export const registerReq = async (data) => {
	return await postApi('/api/users', data)
}

// 用户列表查询
export const userListGet = async () => {
	return await getApi('/api/users')
}

// 个人信息查询
export const userInfoGet = async (id) => {
	return await getApi(`/api/users/${id}`)
}

// 个人信息修改
export const userInfoPut = async (id, data) => {
	return await putApi(`/api/users/${id}`, data)
}

// 用户删除
export const userDelete = async (id) => {
	return await delApi(`/api/users/${id}`)
}

// 用户登录日志
export const userLogGet = async (params) => {
	let urlString = '?'
	Object.keys(params).forEach((key) => {
		urlString += `${key}=${params[key]}&`
	})
	urlString = urlString.slice(0, -1)
	return await getApi(`/api/users/login-logs/${urlString}`)
}
