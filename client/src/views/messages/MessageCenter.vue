<template>
  <div>
    <div class="page-header">
      <h2>消息中心</h2>
      <el-button type="primary" @click="markAllRead" :disabled="!hasUnread">全部标记已读</el-button>
    </div>

    <el-card>
      <el-tabs v-model="activeTab" @tab-change="fetchMessages">
        <el-tab-pane label="全部消息" name="all" />
        <el-tab-pane label="未读消息" name="unread" />
      </el-tabs>

      <el-table :data="list" v-loading="loading" stripe :row-class-name="rowClass">
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <span :style="{ fontWeight: row.is_read ? 'normal' : '600' }">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="300">
          <template #default="{ row }">
            <span style="color: var(--text-secondary);">{{ row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="msg_type" label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="msgTypeMap[row.msg_type]?.type || 'info'" size="small">{{ msgTypeMap[row.msg_type]?.label || row.msg_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="170" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" v-if="!row.is_read" @click="markRead(row.id)">标记已读</el-button>
            <el-button link type="primary" v-if="row.related_order_id" @click="$router.push(`/orders/${row.related_order_id}`)">查看订单</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchMessages" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import { ElMessage } from 'element-plus'

const list = ref([])
const loading = ref(false)
const activeTab = ref('all')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const msgTypeMap = {
  system: { label: '系统', type: 'info' },
  review: { label: '审核', type: '' },
  reminder: { label: '提醒', type: 'warning' },
  urge: { label: '催办', type: 'danger' }
}

const hasUnread = computed(() => list.value.some(m => !m.is_read))

function rowClass({ row }) {
  return row.is_read ? '' : 'unread-row'
}

async function fetchMessages() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize }
    if (activeTab.value === 'unread') params.is_read = 0
    const res = await api.get('/messages', { params })
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

async function markRead(id) {
  await api.put(`/messages/${id}/read`)
  fetchMessages()
}

async function markAllRead() {
  await api.put('/messages/read-all')
  ElMessage.success('已全部标记已读')
  fetchMessages()
}

onMounted(fetchMessages)
</script>

<style scoped>
:deep(.unread-row) {
  background: rgba(79, 70, 229, 0.05) !important;
}
</style>
