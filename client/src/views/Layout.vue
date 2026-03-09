<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <h1>🔖 Xuwu Ledger</h1>
      </div>
      <nav class="sidebar-menu">
        <el-menu :default-active="activeMenu" router>
          <el-menu-item index="/dashboard">
            <el-icon><DataBoard /></el-icon>
            <span>工作台</span>
          </el-menu-item>

          <el-menu-item index="/clients" v-if="canSee(['admin','ops','sales'])">
            <el-icon><User /></el-icon>
            <span>客户管理</span>
          </el-menu-item>

          <el-menu-item index="/orders">
            <el-icon><Document /></el-icon>
            <span>业务单</span>
          </el-menu-item>

          <el-menu-item index="/review" v-if="canSee(['admin','ops'])">
            <el-icon><Checked /></el-icon>
            <span>审核中心</span>
          </el-menu-item>

          <el-menu-item index="/finance" v-if="canSee(['admin','ops'])">
            <el-icon><TrendCharts /></el-icon>
            <span>财务报表</span>
          </el-menu-item>

          <el-menu-item index="/commission" v-if="canSee(['admin','ops','sales'])">
            <el-icon><Money /></el-icon>
            <span>提成明细</span>
          </el-menu-item>

          <el-menu-item index="/contracts" v-if="canSee(['admin','ops'])">
            <el-icon><Notebook /></el-icon>
            <span>合同管理</span>
          </el-menu-item>

          <el-menu-item index="/invoices" v-if="canSee(['admin','ops'])">
            <el-icon><Ticket /></el-icon>
            <span>发票管理</span>
          </el-menu-item>

          <el-menu-item index="/messages">
            <el-icon><Bell /></el-icon>
            <span>消息中心</span>
            <el-badge v-if="unreadCount > 0" :value="unreadCount" :max="99" class="badge-item" />
          </el-menu-item>

          <el-menu-item index="/users" v-if="canSee(['admin'])">
            <el-icon><Setting /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
        </el-menu>
      </nav>
    </aside>

    <!-- 主体区域 -->
    <div class="main-area">
      <header class="top-header">
        <h2>{{ currentTitle }}</h2>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span style="color: var(--text-primary); cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <el-avatar :size="32" style="background: var(--primary);">{{ userStore.realName.charAt(0) }}</el-avatar>
              {{ userStore.realName }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content-area">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import api from '../api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const unreadCount = ref(0)

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '工作台')

function canSee(roles) {
  return roles.includes(userStore.role)
}

async function fetchUnread() {
  try {
    const res = await api.get('/messages/unread-count')
    unreadCount.value = res.data.count
  } catch (e) {}
}

function handleCommand(cmd) {
  if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}

onMounted(() => {
  fetchUnread()
  // 每 30 秒轮询未读消息
  setInterval(fetchUnread, 30000)
})
</script>

<style scoped>
.badge-item {
  margin-left: 6px;
}
</style>
