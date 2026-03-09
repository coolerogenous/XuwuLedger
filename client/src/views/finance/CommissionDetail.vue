<template>
  <div>
    <div class="page-header">
      <h2>提成明细</h2>
    </div>

    <div class="filter-bar">
      <el-date-picker v-model="yearMonth" type="month" placeholder="选择月份" value-format="YYYY-MM" @change="fetchData" />
      <el-button type="primary" @click="fetchData">查询</el-button>
    </div>

    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-label">{{ userStore.role === 'sales' ? '我的' : '' }}提成总额</div>
        <div class="stat-value" style="-webkit-text-fill-color: #10b981;">¥{{ formatMoney(totalCommission) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">提成笔数</div>
        <div class="stat-value">{{ total }}</div>
      </div>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" width="150">
          <template #default="{ row }">
            <router-link :to="`/orders/${row.order_id}`" style="color: var(--primary-light);">{{ row.order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="client_name" label="客户" width="140" />
        <el-table-column prop="product_name" label="产品" min-width="130" />
        <el-table-column prop="total_amount" label="订单金额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.total_amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="base_amount" label="计算基数" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.base_amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="commission_rate" label="提成比例" width="100">
          <template #default="{ row }">{{ ((row.commission_rate || 0) * 100).toFixed(2) }}%</template>
        </el-table-column>
        <el-table-column prop="commission_amount" label="提成金额" width="130" align="right">
          <template #default="{ row }">
            <span style="color: #10b981; font-weight: 600;">¥{{ Number(row.commission_amount || 0).toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'paid' ? 'success' : row.status === 'confirmed' ? '' : 'warning'" size="small">
              {{ row.status === 'paid' ? '已发放' : row.status === 'confirmed' ? '已确认' : '待确认' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="170" />
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchData" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import api from '../../api'

const userStore = useUserStore()
const now = new Date()
const yearMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 20
const total = ref(0)
const totalCommission = ref(0)

function formatMoney(v) { return (parseFloat(v) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchData() {
  loading.value = true
  try {
    const [y, m] = yearMonth.value.split('-')
    const res = await api.get('/finance/commissions', { params: { year: y, month: m, page: page.value, pageSize } })
    list.value = res.data.list
    total.value = res.data.total
    totalCommission.value = res.data.total_commission
  } finally { loading.value = false }
}

onMounted(fetchData)
</script>
