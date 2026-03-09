<template>
  <div>
    <div class="page-header">
      <h2>财务报表</h2>
    </div>

    <div class="filter-bar">
      <el-date-picker v-model="yearMonth" type="month" placeholder="选择月份" value-format="YYYY-MM" @change="fetchReport" />
      <el-button type="primary" @click="fetchReport">查询</el-button>
    </div>

    <!-- 汇总卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-label">对公入账</div>
        <div class="stat-value" style="-webkit-text-fill-color: #10b981;">¥{{ formatMoney(summary.corporate_in) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">对私入账</div>
        <div class="stat-value" style="-webkit-text-fill-color: #6366f1;">¥{{ formatMoney(summary.personal_in) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">对公出账</div>
        <div class="stat-value" style="-webkit-text-fill-color: #ef4444;">¥{{ formatMoney(summary.corporate_out) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">对私出账</div>
        <div class="stat-value" style="-webkit-text-fill-color: #f59e0b;">¥{{ formatMoney(summary.personal_out) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">完成订单数</div>
        <div class="stat-value">{{ summary.completed_orders || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">销项发票</div>
        <div class="stat-value">¥{{ formatMoney(summary.invoice_output) }}</div>
      </div>
    </div>

    <!-- 纳税估算 -->
    <el-card style="margin-bottom: 20px;">
      <template #header><span>纳税基数估算</span></template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="对公收入">¥{{ formatMoney(taxData.corporate_income) }}</el-descriptions-item>
        <el-descriptions-item label="销项金额">¥{{ formatMoney(taxData.output_invoice_amount) }}</el-descriptions-item>
        <el-descriptions-item label="销项税额">¥{{ formatMoney(taxData.output_tax) }}</el-descriptions-item>
        <el-descriptions-item label="进项金额">¥{{ formatMoney(taxData.input_invoice_amount) }}</el-descriptions-item>
        <el-descriptions-item label="进项税额">¥{{ formatMoney(taxData.input_tax) }}</el-descriptions-item>
        <el-descriptions-item label="增值税应纳">
          <span style="font-weight: 700; font-size: 16px; color: var(--danger);">¥{{ formatMoney(taxData.vat_payable) }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 流水明细 -->
    <el-card>
      <template #header><span>流水明细</span></template>
      <el-table :data="details" stripe>
        <el-table-column prop="order_no" label="订单号" width="150" />
        <el-table-column prop="client_name" label="客户" width="140" />
        <el-table-column prop="record_type" label="类型" width="110">
          <template #default="{ row }">{{ fundTypeMap[row.record_type] || row.record_type }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.amount).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="direction" label="方向" width="60">
          <template #default="{ row }">
            <el-tag :type="row.direction === 'in' ? 'success' : 'danger'" size="small">{{ row.direction === 'in' ? '入' : '出' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="account_type" label="账户" width="60">
          <template #default="{ row }">{{ row.account_type === 'corporate' ? '对公' : '对私' }}</template>
        </el-table-column>
        <el-table-column prop="record_date" label="日期" width="110" />
        <el-table-column prop="remark" label="备注" min-width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'

const now = new Date()
const yearMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const summary = reactive({ corporate_in: 0, personal_in: 0, corporate_out: 0, personal_out: 0, completed_orders: 0, invoice_output: 0 })
const taxData = reactive({ corporate_income: 0, output_invoice_amount: 0, output_tax: 0, input_invoice_amount: 0, input_tax: 0, vat_payable: 0 })
const details = ref([])
const fundTypeMap = { service_fee: '服务费', retention: '留利', payment_to_client: '付客户', payment_to_partner: '付链条方' }

function formatMoney(v) { return (parseFloat(v) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchReport() {
  const [y, m] = yearMonth.value.split('-')
  try {
    const [reportRes, taxRes] = await Promise.all([
      api.get('/finance/monthly-report', { params: { year: y, month: m } }),
      api.get('/finance/tax-estimate', { params: { year: y, month: m } })
    ])
    Object.assign(summary, reportRes.data.summary)
    details.value = reportRes.data.details
    Object.assign(taxData, taxRes.data)
  } catch (e) {}
}

onMounted(fetchReport)
</script>
