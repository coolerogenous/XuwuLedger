import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const api = axios.create({
    baseURL: '/api',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
})

// 请求拦截：自动附加 JWT
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// 响应拦截：统一错误处理
api.interceptors.response.use(
    response => response.data,
    error => {
        const res = error.response
        if (res) {
            if (res.status === 401) {
                // 登录接口的 401 显示后端实际错误信息，不跳转
                const isLoginRequest = res.config?.url?.includes('/auth/login')
                if (isLoginRequest) {
                    ElMessage.error(res.data?.message || '用户名或密码错误')
                } else {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    router.push('/login')
                    ElMessage.error('登录已过期，请重新登录')
                }
            } else {
                ElMessage.error(res.data?.message || '请求失败')
            }
        } else {
            ElMessage.error('网络连接失败')
        }
        return Promise.reject(error)
    }
)

export default api
