<template>
  <div v-loading="loading">
    <div class="page-header">
      <h2>客户详情 - {{ client.company_name }}</h2>
      <el-button @click="$router.back()">返回</el-button>
    </div>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header><span>基本信息</span></template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="企业名称">{{ client.company_name }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ client.contact_name }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ client.contact_phone }}</el-descriptions-item>
            <el-descriptions-item label="绑定销售">{{ client.sales_name }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ client.created_at }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>客户账号</span>
              <el-button v-if="!client.user_id" type="primary" size="small" @click="showAccountDialog = true">创建登录账号</el-button>
              <el-tag v-else type="success">已开通</el-tag>
            </div>
          </template>
          <div v-if="client.qualification">
            <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 8px;">资质信息</p>
            <p>{{ client.qualification }}</p>
          </div>
          <el-empty v-else description="暂无资质信息" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px;">
      <template #header><span>关联业务单</span></template>
      <el-table :data="client.orders || []" stripe>
        <el-table-column prop="order_no" label="订单号" width="160">
          <template #default="{ row }">
            <router-link :to="`/orders/${row.id}`" style="color: var(--primary-light);">{{ row.order_no }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="product_name" label="产品" />
        <el-table-column prop="total_amount" label="流水金额" width="140">
          <template #default="{ row }">¥{{ Number(row.total_amount || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
      </el-table>
    </el-card>

    <!-- 创建账号弹窗 -->
    <el-dialog v-model="showAccountDialog" title="为客户创建登录账号" width="420">
      <el-form :model="accountForm" label-width="80px">
        <el-form-item label="用户名"><el-input v-model="accountForm.username" /></el-form-item>
        <el-form-item label="初始密码"><el-input v-model="accountForm.password" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAccountDialog = false">取消</el-button>
        <el-button type="primary" @click="createAccount">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const loading = ref(false)
const client = ref({})
const showAccountDialog = ref(false)
const accountForm = reactive({ username: '', password: '' })

const statusMap = { draft: '草稿', pending_material: '待传资料', ops_reviewing: '运营审核中', partner_confirming: '链条方确认中', fund_recording: '资金录入', contract_signing: '合同签署中', invoicing: '开票中', completed: '已完结', rejected: '已驳回' }
const statusTypeMap = { draft: 'info', pending_material: 'warning', ops_reviewing: '', partner_confirming: '', fund_recording: '', contract_signing: 'warning', invoicing: '', completed: 'success', rejected: 'danger' }
function getStatusLabel(s) { return statusMap[s] || s }
function getStatusType(s) { return statusTypeMap[s] || '' }

async function fetchDetail() {
  loading.value = true
  try {
    const res = await api.get(`/clients/${route.params.id}`)
    client.value = res.data
  } finally { loading.value = false }
}

async function createAccount() {
  await api.post(`/clients/${route.params.id}/account`, accountForm)
  ElMessage.success('客户账号创建成功')
  showAccountDialog.value = false
  fetchDetail()
}

onMounted(fetchDetail)
</script>
