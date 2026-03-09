<template>
  <div>
    <div class="page-header">
      <h2>发票管理</h2>
    </div>

    <div class="filter-bar">
      <el-date-picker v-model="yearMonth" type="month" placeholder="选择月份" value-format="YYYY-MM" @change="fetchReconciliation" />
      <el-button type="primary" @click="fetchReconciliation">核对</el-button>
    </div>

    <!-- 核对结果 -->
    <el-card style="margin-bottom: 20px;" v-if="recon.year">
      <template #header><span>{{ recon.year }}年{{ recon.month }}月 发票核对</span></template>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="对公入账">¥{{ formatMoney(recon.corporate_income) }}</el-descriptions-item>
        <el-descriptions-item label="销项发票总额">¥{{ formatMoney(recon.output_invoice_total) }}</el-descriptions-item>
        <el-descriptions-item label="差额">¥{{ formatMoney(recon.difference) }}</el-descriptions-item>
        <el-descriptions-item label="是否平账">
          <el-tag :type="recon.is_balanced ? 'success' : 'danger'">{{ recon.is_balanced ? '已平账' : '未平账' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 说明文字 -->
    <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
      发票通过业务单详情页录入。进项发票 = 公司B开给本公司的发票；销项发票 = 本公司开给客户的服务费发票。
    </el-alert>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'

const now = new Date()
const yearMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const recon = reactive({ year: null, month: null, corporate_income: 0, output_invoice_total: 0, difference: 0, is_balanced: false })

function formatMoney(v) { return (parseFloat(v) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchReconciliation() {
  const [y, m] = yearMonth.value.split('-')
  try {
    const res = await api.get('/contracts/reconciliation', { params: { year: y, month: m } })
    Object.assign(recon, res.data)
  } catch (e) {}
}

onMounted(fetchReconciliation)
</script>
