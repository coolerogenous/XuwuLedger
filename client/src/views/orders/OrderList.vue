<template>
  <div>
    <div class="page-header">
      <h2>业务单管理</h2>
      <el-button type="primary" @click="showCreate = true" v-if="['admin','ops','sales'].includes(userStore.role)">
        <el-icon><Plus /></el-icon> 新建业务单
      </el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="订单状态" clearable style="width: 160px" @change="fetchList">
        <el-option v-for="(label, key) in statusMap" :key="key" :label="label" :value="key" />
      </el-select>
      <el-input v-model="keyword" placeholder="搜索订单号/产品/客户" clearable style="width: 280px" @clear="fetchList" @keyup.enter="fetchList">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button @click="fetchList">搜索</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" width="150">
          <template #default="{ row }">
            <router-link :to="`/orders/${row.id}`" style="color: var(--primary-light);">{{ row.order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="client_name" label="客户" min-width="140" />
        <el-table-column prop="product_name" label="产品" min-width="140" />
        <el-table-column prop="pre_transaction_amount" label="预刷流水" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.pre_transaction_amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="service_fee" label="服务费" width="120" align="right">
          <template #default="{ row }">¥{{ Number(row.service_fee || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="retention_profit" label="留利" width="120" align="right">
          <template #default="{ row }">¥{{ Number(row.retention_profit || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sales_name" label="销售" width="90" />
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/orders/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="fetchList" />
      </div>
    </el-card>

    <!-- 新建业务单弹窗 -->
    <el-dialog v-model="showCreate" title="新建业务单" width="560">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="选择客户" prop="client_id">
          <el-select v-model="form.client_id" placeholder="请选择客户" filterable style="width: 100%" @focus="fetchClients">
            <el-option v-for="c in clients" :key="c.id" :label="c.company_name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="产品名称" prop="product_name">
          <el-input v-model="form.product_name" placeholder="客户下单产品" />
        </el-form-item>
        <el-form-item label="预刷流水值" prop="pre_transaction_amount">
          <el-input-number v-model="form.pre_transaction_amount" :min="0" :precision="2" :step="10000" style="width: 100%" />
        </el-form-item>
        <el-form-item label="服务费比例">
          <el-input-number v-model="form.service_fee_rate" :min="0" :max="1" :precision="4" :step="0.01" style="width: 100%" />
          <div style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">
            服务费 = {{ (form.pre_transaction_amount * form.service_fee_rate).toFixed(2) }} 元
          </div>
        </el-form-item>
        <el-form-item label="留利比例">
          <el-input-number v-model="form.retention_profit_rate" :min="0" :max="1" :precision="4" :step="0.01" style="width: 100%" />
          <div style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">
            留利 = {{ (form.pre_transaction_amount * form.retention_profit_rate).toFixed(2) }} 元
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="submitting">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import api from '../../api'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const list = ref([])
const clients = ref([])
const loading = ref(false)
const submitting = ref(false)
const showCreate = ref(false)
const keyword = ref('')
const filterStatus = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const formRef = ref(null)

const statusMap = { draft: '草稿', pending_material: '待传资料', ops_reviewing: '运营审核中', partner_confirming: '链条方确认中', fund_recording: '资金录入', contract_signing: '合同签署中', invoicing: '开票中', completed: '已完结', rejected: '已驳回' }
const statusTypeMap = { draft: 'info', pending_material: 'warning', ops_reviewing: '', partner_confirming: '', fund_recording: '', contract_signing: 'warning', invoicing: '', completed: 'success', rejected: 'danger' }
function getStatusLabel(s) { return statusMap[s] || s }
function getStatusType(s) { return statusTypeMap[s] || '' }

const form = reactive({ client_id: null, product_name: '', pre_transaction_amount: 0, service_fee_rate: 0, retention_profit_rate: 0, remark: '' })
const rules = {
  client_id: [{ required: true, message: '请选择客户', trigger: 'change' }],
  product_name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }]
}

async function fetchList() {
  loading.value = true
  try {
    const res = await api.get('/orders', { params: { status: filterStatus.value, keyword: keyword.value, page: page.value, pageSize } })
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

async function fetchClients() {
  if (clients.value.length) return
  const res = await api.get('/clients', { params: { pageSize: 200 } })
  clients.value = res.data.list
}

async function handleCreate() {
  await formRef.value.validate()
  submitting.value = true
  try {
    await api.post('/orders', form)
    ElMessage.success('业务单创建成功')
    showCreate.value = false
    Object.assign(form, { client_id: null, product_name: '', pre_transaction_amount: 0, service_fee_rate: 0, retention_profit_rate: 0, remark: '' })
    fetchList()
  } finally { submitting.value = false }
}

onMounted(fetchList)
</script>
