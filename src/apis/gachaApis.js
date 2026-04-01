import { getApi, postApi } from '@/common/requests/requests.js'

const BASE_URL = '/api/gacha'

const buildQueryString = (params = {}) => {
	const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
	if (!entries.length) return ''

	const search = new URLSearchParams()
	entries.forEach(([key, value]) => {
		search.append(key, value)
	})

	return `?${search.toString()}`
}

export const gachaPrizeListGet = async () => {
	return await getApi(`${BASE_URL}/prizes`)
}

export const gachaProfileGet = async () => {
	return await getApi(`${BASE_URL}/me`)
}

export const gachaDrawReq = async () => {
	return await postApi(`${BASE_URL}/draw`)
}

export const gachaInventoryGet = async (params = {}) => {
	return await getApi(`${BASE_URL}/inventory${buildQueryString(params)}`)
}

export const gachaInventorySellReq = async (inventoryId) => {
	return await postApi(`${BASE_URL}/inventory/${inventoryId}/sell`)
}

export const gachaTransactionsGet = async (params = {}) => {
	return await getApi(`${BASE_URL}/transactions${buildQueryString(params)}`)
}
