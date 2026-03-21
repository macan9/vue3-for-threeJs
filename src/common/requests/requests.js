import api from '@/common/requests/axiosInstance.js'

const buildErrorMessage = (error) => {
  const responseMessage = error?.response?.data?.message
  const message = responseMessage || error?.message || '请求失败'
  return String(message)
}

const buildFallback = (url, error) => {
  const u = String(url || '')

  // gitee 列表类接口：返回空数组，避免页面渲染时报错
  if (u.startsWith('/gitee')) {
    return []
  }

  // 业务接口统一兜底：尽量模拟后端常用返回结构，避免解构/深层取值直接抛错
  return {
    code: -1,
    data: null,
    message: buildErrorMessage(error),
    error: {
      status: error?.response?.status,
    },
  }
}

export const isApiSuccess = (response) => {
  return response?.success === true || response?.code === 0 || response?.code === 200 || response?.code === 304
}

export const ensureApiSuccess = (response, fallbackMessage = '请求失败') => {
  if (isApiSuccess(response)) return response
  throw new Error(response?.message || fallbackMessage)
}

export const postApi = async (url,data)=>{
  try{
    const res = await api.post(url,data)
    return res.data
  }catch(error){
    console.error(error);
    return buildFallback(url, error)
  }
}
  
export const getApi = async (url)=>{
  try{
    const res = await api.get(url)
    return res.data
  }catch(error){
    console.error(error);
    return buildFallback(url, error)
  }
}
  
export const delApi = async (url)=>{
  try{
    const res = await api.delete(url)
    return res.data
  }catch(error){
    console.error(error);
    return buildFallback(url, error)
  }
}
  
export const putApi = async (url,data)=>{
  try{
    const res = await api.put(url,data)
    return res.data
  }catch(error){
    console.error(error);
    return buildFallback(url, error)
  }
}
  
