<template>
  <div>
    <!-- 销售工作台 -->
    <template v-if="userStore.role === 'sales'">
      <div class="stat-cards">
        <div class="stat-card">
          <el-icon class="stat-icon"><User /></el-icon>
          <div class="stat-label">本月新增客户</div>
          <div class="stat-value">{{ data.new_clients_this_month || 0 }}</div>
        </div>
        <div class="stat-card">
          <el-icon class="stat-icon"><Upload /></el-icon>
          <div class="stat-label">待客户上传资料</div>
          <div class="stat-value">{{ data.pending_material_orders || 0 }}</div>
        </div>
        <div class="stat-card">
          <el-icon class="stat-icon"><Money /></el-icon>
          <div class="stat-label">本月预估提成</div>
          <div class="stat-value">¥{{ formatMoney(data.estimated_commission) }}</div>
        </div>
        <div class="stat-card">
          <el-icon class="stat-icon"><ChatDotSquare /></el-icon>
          <div class="stat-label">未读消息</div>
          <div class="stat-value">{{ data.unread_messages || 0 }}</div>
        </div>
      </div>

      <el-card>
        <template #header><span>我的订单概览</span></template>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <el-tag v-for="item in data.order_status_summary" :key="item.status" :type="getStatusType(item.status)" size="large">
            {{ getStatusLabel(item.status) }}: {{ item.count }}
          </el-tag>
          <el-tag v-if="!data.order_status_summary?.length" type="info">暂无订单</el-tag>
        </div>
      </el-card>
    </template>

    <!-- 运营/管理员工作台 -->
    <template v-if="['ops', 'admin'].includes(userStore.role)">
      <div class="stat-cards">
        <div class="stat-card">
          <el-icon class="stat-icon"><Checked /></el-icon>
          <div class="stat-label">待审核订单</div>
          <div class="stat-value">{{ data.pending_review_orders || 0 }}</div>
        </div>
        <div class="stat-card">
          <el-icon class="stat-icon"><Document /></el-icon>
          <div class="stat-label">待审核资料</div>
          <div class="stat-value">{{ data.pending_materials || 0 }}</div>
        </div>
        <div class="stat-card">
          <el-icon class="stat-icon"><Notebook /></el-icon>
          <div class="stat-label">待签合同</div>
          <div class="stat-value">{{ data.pending_contracts || 0 }}</div>
        </div>
        <div class="stat-card">
          <el-icon class="stat-icon"><TrendCharts /></el-icon>
          <div class="stat-label">本月全局流水</div>
          <div class="stat-value">¥{{ formatMoney(data.monthly_flow) }}</div>
        </div>
      </div>

      <el-card>
        <template #header><span>全局订单状态</span></template>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <el-tag v-for="item in data.order_status_summary" :key="item.status" :type="getStatusType(item.status)" size="large">
            {{ getStatusLabel(item.status) }}: {{ item.count }}
          </el-tag>
        </div>
      </el-card>
    </template>

    <!-- 客户工作台 -->
    <template v-if="userStore.role === 'client'">
      <div class="stat-cards">
        <div class="stat-card">
          <el-icon class="stat-icon"><Warning /></el-icon>
          <div class="stat-label">待办事项</div>
          <div class="stat-value">{{ data.pending_tasks || 0 }}</div>
        </div>
        <div class="stat-card">
          <el-icon class="stat-icon"><ChatDotSquare /></el-icon>
          <div class="stat-label">未读消息</div>
          <div class="stat-value">{{ data.unread_messages || 0 }}</div>
        </div>
      </div>

      <el-card>
        <template #header><span>我的历史订单</span></template>
        <el-table :data="data.recent_orders || []" stripe>
          <el-table-column prop="order_no" label="订单号" width="160" />
          <el-table-column prop="product_name" label="产品名称" />
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="180" />
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import api from '../api'

const userStore = useUserStore()
const data = ref({})

const statusMap = {
  draft: '草稿', pending_material: '待传资料', ops_reviewing: '运营审核中',
  partner_confirming: '链条方确认中', fund_recording: '资金录入',
  contract_signing: '合同签署中', invoicing: '开票中', completed: '已完结', rejected: '已驳回'
}

const statusTypeMap = {
  draft: 'info', pending_material: 'warning', ops_reviewing: '',
  partner_confirming: '', fund_recording: '', contract_signing: 'warning',
  invoicing: '', completed: 'success', rejected: 'danger'
}

function getStatusLabel(s) { return statusMap[s] || s }
function getStatusType(s) { return statusTypeMap[s] || '' }
function formatMoney(v) { return (parseFloat(v) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

onMounted(async () => {
  try {
    const res = await api.get('/dashboard')
    data.value = res.data
  } catch (e) {}
})
</script>
