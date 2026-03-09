import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useUserStore = defineStore('user', () => {
    const token = ref(localStorage.getItem('token') || '')
    const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))

    const isLoggedIn = computed(() => !!token.value)
    const role = computed(() => user.value.role || '')
    const realName = computed(() => user.value.real_name || user.value.username || '')

    async function login(username, password) {
        const res = await api.post('/auth/login', { username, password })
        token.value = res.data.token
        user.value = res.data.user
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        return res
    }

    function logout() {
        token.value = ''
        user.value = {}
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    async function fetchMe() {
        const res = await api.get('/auth/me')
        user.value = res.data
        localStorage.setItem('user', JSON.stringify(res.data))
    }

    return { token, user, isLoggedIn, role, realName, login, logout, fetchMe }
})
