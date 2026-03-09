import { createRouter, createWebHistory } from 'vue-router'
import { APP_CONFIG } from '../config'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue'),
        meta: { title: '登录', public: true }
    },
    {
        path: '/',
        component: () => import('../views/Layout.vue'),
        redirect: '/dashboard',
        children: [
            {
                path: 'dashboard',
                name: 'Dashboard',
                component: () => import('../views/Dashboard.vue'),
                meta: { title: '工作台' }
            },
            {
                path: 'clients',
                name: 'ClientList',
                component: () => import('../views/clients/ClientList.vue'),
                meta: { title: '客户管理', roles: ['admin', 'ops', 'sales'] }
            },
            {
                path: 'clients/:id',
                name: 'ClientDetail',
                component: () => import('../views/clients/ClientDetail.vue'),
                meta: { title: '客户详情', roles: ['admin', 'ops', 'sales'] }
            },
            {
                path: 'orders',
                name: 'OrderList',
                component: () => import('../views/orders/OrderList.vue'),
                meta: { title: '业务单管理' }
            },
            {
                path: 'orders/:id',
                name: 'OrderDetail',
                component: () => import('../views/orders/OrderDetail.vue'),
                meta: { title: '业务单详情' }
            },
            {
                path: 'review',
                name: 'ReviewList',
                component: () => import('../views/review/ReviewList.vue'),
                meta: { title: '审核中心', roles: ['admin', 'ops'] }
            },
            {
                path: 'finance',
                name: 'FinanceReport',
                component: () => import('../views/finance/FinanceReport.vue'),
                meta: { title: '财务报表', roles: ['admin', 'ops'] }
            },
            {
                path: 'commission',
                name: 'CommissionDetail',
                component: () => import('../views/finance/CommissionDetail.vue'),
                meta: { title: '提成明细', roles: ['admin', 'ops', 'sales'] }
            },
            {
                path: 'contracts',
                name: 'ContractList',
                component: () => import('../views/contracts/ContractList.vue'),
                meta: { title: '合同管理', roles: ['admin', 'ops'] }
            },
            {
                path: 'invoices',
                name: 'InvoiceList',
                component: () => import('../views/contracts/InvoiceList.vue'),
                meta: { title: '发票管理', roles: ['admin', 'ops'] }
            },
            {
                path: 'messages',
                name: 'MessageCenter',
                component: () => import('../views/messages/MessageCenter.vue'),
                meta: { title: '消息中心' }
            },
            {
                path: 'users',
                name: 'UserManage',
                component: () => import('../views/UserManage.vue'),
                meta: { title: '用户管理', roles: ['admin'] }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')

    if (to.meta.public) {
        return next()
    }

    if (!token) {
        return next('/login')
    }

    // 角色权限检查
    if (to.meta.roles && !to.meta.roles.includes(user.role)) {
        return next('/dashboard')
    }

    document.title = `${to.meta.title || APP_CONFIG.systemEnglishName} - ${APP_CONFIG.pageTitleSuffix}`
    next()
})

export default router
